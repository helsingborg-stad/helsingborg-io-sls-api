import AWS from '../../libs/aws-sdk';
import uuid from 'uuid';
import logger from '@financial-times/lambda-logger';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// create (POST)
export const main = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: process.env.tableName,
    Item: {
      submissionId: uuid.v1(),
      createdAt: Date.now(),
      ...data,
    },
  };

  dynamoDb.put(params, (error, data) => {

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    };

    if(error) {
      logger.info(error)

      const response = {
        statusCode: 500,
        headers,
        body: JSON.stringify({ status: false }),
      };

      callback(null, response);
      return;
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify(params.Item),
    };

    callback(null, response);
  });
};
