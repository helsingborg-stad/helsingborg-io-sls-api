import AWS from './aws-sdk';
import config from '../config';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export function call(action, params) {
  return dynamoDb[action]({
    ...params,
    TableName: `${config.resourcesStage}-${params.TableName}`,
  }).promise();
}
