import to from 'await-to-js';
import config from '../../../config';
import { buildResponse } from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get form by id
export async function main(event) {
  const { formId } = event.pathParameters;
  const formPartitionKey = `FORM#${formId}`;
  const params = {
    TableName: config.forms.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': formPartitionKey,
    },
  };

  const [error, queryResponse] = await to(getFormRequest(params));
  if (error) return buildResponse(error.status, error);
  if (queryResponse[1].Count === 0) {
    return buildResponse(404, { error: 'Form with that id not found in the database.' });
  }
  return buildResponse(200, queryResponse[1].Items[0]);
}

export async function getFormRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  return [error, result];
}
