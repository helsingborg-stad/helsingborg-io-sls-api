import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from '../../../libs/S3';
import { buildResponse } from '../../../libs/response';
import { decodeToken } from '../../../libs/token';

const bucketName = process.env.BUCKET_NAME;

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const decodedToken = decodeToken(event);
  const { filename } = event.pathParameters;
  const { personalNumber } = decodedToken as { personalNumber: string };

  if (!filename) {
    return buildResponse(400, {
      type: 'userAttachment',
      attributes: { message: 'Need a filename as part of the path.' },
    });
  }

  const s3Key = `${personalNumber}/${filename}`;

  // Check if the specified file exists in the bucket
  const listFilesResponse = await s3Client
    .listObjectsV2({
      Bucket: bucketName,
      Prefix: `${personalNumber}/`,
    })
    .promise();
  const fileInBucket = listFilesResponse.Contents.find(file => file?.Key === s3Key);
  if (!fileInBucket) {
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

  const deleteResponse = await s3Client
    .deleteObject({
      Bucket: bucketName,
      Key: s3Key,
    })
    .promise();

  if (deleteResponse.$response.error) {
    console.error('Delete error: ', deleteResponse.$response.error.message);
    return buildResponse(deleteResponse.$response.error.code, {
      type: 'userAttachment',
      attributes: {
        type: 'deleteError',
        bucket: bucketName,
        filename,
        deletedFileKey: s3Key,
        message: deleteResponse.$response.error.message,
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
