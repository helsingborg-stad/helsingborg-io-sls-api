import AWS from '../../libs/aws-sdk';
import logger from '@financial-times/lambda-logger';
import { catchError } from '../../libs/helpers';

const dynamoClient = new AWS.DynamoDB.DocumentClient();

// delete (DELETE)
export const main = (event, context, callback) => {
  const TableName = `${process.env.resourcesStage}-submissions`;

  const params = {
    TableName: TableName,
    Key: {
      userId: event.body.userId,
      submissionId: event.pathParameters.submissionId,
    },
  };

  const { ok, response } = catchError(
    dynamoClient.delete(params).promise(),
  );

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  if (!ok) {
    callback(null, {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: false, error: response }),
    });
  }

  callback(null, {
    statusCode: 200,
    headers,
    body: JSON.stringify({ status: true }),
  });
};
