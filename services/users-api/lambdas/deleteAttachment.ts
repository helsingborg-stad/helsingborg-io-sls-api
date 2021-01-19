import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import to from 'await-to-js';
import { buildResponse } from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import { AWSError } from 'aws-sdk/lib/error';

const s3Client = new S3();
const bucketName = process.env.BUCKET_NAME;

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const decodedToken = decodeToken(event);
  const { filename } = event.pathParameters;
  const { personalNumber } = decodedToken as { personalNumber: string };

  if (!filename) {
    return buildResponse(400, {
      type: 'userAttachment',
      attributes: {
        type: 'noFilenameError',
        message: 'Need a filename as part of the path.',
      },
    });
  }
  const s3Key = `${personalNumber}/${filename}`;

  // Check if the specified file exists in the bucket
  const [noFileError] = await to(findFileInS3(personalNumber, s3Key));
  if (noFileError) {
    return buildResponse(404, {
      type: 'userAttachment',
      attributes: {
        type: 'deleteError',
        bucket: bucketName,
        filename,
        deletedFileKey: s3Key,
        message: `No file with key '${s3Key}', filename '${filename}', exists in storage. Nothing was deleted.`,
      },
    });
  }

  const [deleteError] = await to<boolean, AWSError>(deleteFile(s3Key));
  if (deleteError) {
    return buildResponse(deleteError.code, {
      type: 'userAttachment',
      attributes: {
        type: 'deleteError',
        bucket: bucketName,
        filename,
        deletedFileKey: s3Key,
        message: deleteError.message,
      },
    });
  }

  return buildResponse(200, {
    type: 'userAttachment',
    attributes: {
      type: 'deleteSuccess',
      bucket: bucketName,
      filename,
      deletedFileKey: s3Key,
    },
  });
};

const findFileInS3 = async (personalNumber: string, s3Key: string) => {
  const listFilesResponse = await s3Client
    .listObjectsV2({
      Bucket: bucketName,
      Prefix: `${personalNumber}/`,
    })
    .promise();
  const fileInBucket = listFilesResponse.Contents.find(file => file?.Key === s3Key);
  if (!fileInBucket) {
    throw Error(`No file with key '${s3Key}' exists in storage. Nothing was deleted.`);
  }
  return true;
};

const deleteFile = async (s3Key: string) => {
  const deleteResponse = await s3Client
    .deleteObject({
      Bucket: bucketName,
      Key: s3Key,
    })
    .promise();
  if (deleteResponse.$response.error) {
    throw deleteResponse.$response.error;
  }
  return true;
};
