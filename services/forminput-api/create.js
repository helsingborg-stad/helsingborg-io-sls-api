import AWS from '../../libs/aws-sdk';
import uuid from 'uuid';
import logger from '@financial-times/lambda-logger';

const dynamoDb = new AWS.DynamoDB({ region: 'eu-west-1' });
const dynamoClient = new AWS.DynamoDB.DocumentClient({ service: dynamoDb });

// create (POST)
export const main = (event, context, callback) => {
  const data = JSON.parse(event.body);
  logger.info(data);

  const tableName = `${process.env.resourcesStage}-submissions`;

  const params = {
    TableName: tableName,
    Item: {
      userId: data.userId,
      submissionId: uuid.v1(),
      createdAt: Date.now(),
      answers: data.answers,
    },
  };

  dynamoClient.put(params, (error, data) => {

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    };

    if (error) {
      logger.info(error);

      const response = {
        statusCode: 500,
        headers,
        body: JSON.stringify({ status: false, error }),
      };

      callback(null, response);
      return;
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify(params.Item.submissionId),
    };

    callback(null, response);
  });
};
