import AWS from 'aws-sdk';
import config from './config';
export const docClient = new AWS.DynamoDB.DocumentClient();

export function call(action, params) {
  return docClient[action]({
    ...params,
    TableName: `${config.resourcesStage}-${params.TableName}`,
  }).promise();
}

export function unmarshall(record) {
  return AWS.DynamoDB.Converter.unmarshall(record);
}
