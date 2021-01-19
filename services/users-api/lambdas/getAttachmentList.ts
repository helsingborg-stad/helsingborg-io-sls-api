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

  const [error, fileList] = await to<S3.ObjectList, AWSError>(getFileList(personalNumber));

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

  const files = fileList
    .filter(file => file.Key !== `${personalNumber}/`) // The 'folder' with the name of the personal number is returned as a pseudofile, so we filter that out.
    .map(file => ({
      key: file.Key,
      filename: file.Key.substring(`${personalNumber}/`.length),
      size: file.Size,
      lastModified: file.LastModified,
    }));

  return buildResponse(200, {
    type: 'userAttachment',
    attributes: {
      type: 'fileList',
      bucket: bucketName,
      personalNumber,
      files,
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
  return listFilesResponse.Contents;
};
