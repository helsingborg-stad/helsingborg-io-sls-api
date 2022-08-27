import DynamoDB from 'aws-sdk/clients/dynamodb';

import config from './config';

export const docClient = new DynamoDB.DocumentClient();

export function call(action, params) {
  return docClient[action]({
    ...params,
    TableName: `${config.resourcesStage}-${params.TableName}`,
  }).promise();
}

export function unmarshall(record) {
  return DynamoDB.Converter.unmarshall(record);
}
