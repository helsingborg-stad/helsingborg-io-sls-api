import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AWSError } from 'aws-sdk/lib/error';
import to from 'await-to-js';
import S3 from 'aws-sdk/clients/s3';

import { buildResponse } from '../../../libs/response';
import { decodeToken } from '../../../libs/token';

const s3Client = new S3();
const bucketName = process.env.BUCKET_NAME;

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken as { personalNumber: string };

  const [error, files] = await to<
    { key: string; filename: string; size: number; lastModified: Date }[],
    AWSError
  >(getFileList(personalNumber));

  if (error) {
    return buildResponse(error.code, {
      type: 'userAttachment',
      attributes: {
        type: 'fileListError',
        bucket: bucketName,
        personalNumber,
        message: error.message,
        stackTrace: error.stack,
      },
    });
  }

  const totalFileSize = files.reduce((sum, currentFile) => sum + currentFile.size, 0);
  return buildResponse(200, {
    type: 'userAttachment',
    attributes: {
      type: 'fileList',
      bucket: bucketName,
      personalNumber,
      files,
      totalFileSize,
    },
  });
};

const getFileList = async (Prefix: string) => {
  const listFilesResponse = await s3Client
    .listObjectsV2({
      Bucket: bucketName,
      Prefix,
    })
    .promise();
  if (listFilesResponse.$response.error) {
    throw listFilesResponse.$response.error;
  }
  // The 'folder' with the name of the personal number is returned as a pseudofile, so we filter that out.
  const files = listFilesResponse.Contents.filter(file => file.Key !== `${Prefix}/`).map(file => ({
    key: file.Key,
    filename: file.Key.substring(`${Prefix}/`.length),
    size: file.Size,
    lastModified: file.LastModified,
  }));

  return files;
};
