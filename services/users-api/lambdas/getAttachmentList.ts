import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildResponse } from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import S3 from 'aws-sdk/clients/s3';

export const s3Client = new S3();
const bucketName = process.env.BUCKET_NAME;

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken as { personalNumber: string };

  const listFilesResponse = await s3Client
    .listObjectsV2({
      Bucket: bucketName,
      Prefix: `${personalNumber}/`,
    })
    .promise();

  const files = listFilesResponse.Contents.filter(file => file.Key !== `${personalNumber}/`).map(
    file => ({
      key: file.Key,
      filename: file.Key.substring(`${personalNumber}/`.length),
      size: file.Size,
      lastModified: file.LastModified,
    })
  );

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
