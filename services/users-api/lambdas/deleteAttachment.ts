import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3, { s3Client } from '../../../libs/S3';
import { buildResponse } from '../../../libs/response';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import { DeleteObjectRequest } from 'aws-sdk/clients/s3';

const bucketName = process.env.BUCKET_NAME; 

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const decodedToken = decodeToken(event);
  const { filename } = event.pathParameters;
  const { personalNumber } = (decodedToken as {personalNumber: string});

  if (!filename) {
    return response.failure(buildResponse(400, { message: 'Need a filename as part of the path.'));
  }
  // The path to where the file is in the s3 bucket
  const s3Key = `${personalNumber}/${filename}`;

  const params: DeleteObjectRequest = {
    Bucket: bucketName,
    Key: s3Key,
  };
  
  const deleteResponse = await s3Client.deleteObject(params).promise();

  if (deleteResponse.$response.error) {
    console.log('Delete error', deleteResponse.$response.error.message);
    return response.failure(buildResponse(deleteResponse.$response.error.code, deleteResponse.$response.error.message))
  }

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      type: 'file deleted',
      awsResponse: deleteResponse.$response,
    },
  });
};
