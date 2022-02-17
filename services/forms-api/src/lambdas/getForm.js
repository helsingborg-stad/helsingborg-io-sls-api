import to from 'await-to-js';
import config from '../libs/config';
import { buildResponse } from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

// get form by id
export async function main(event, context) {
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
  if (error) {
    log.error(
      'Get form request error',
      context.awsRequestId,
      'service-forms-api-getForm-001',
      error
    );
    return buildResponse(error.status, error);
  }

  if (queryResponse[1].Count === 0) {
    const errorMessage = 'Form with that id not found in the database.';
    log.error(errorMessage, context.awsRequestId, 'service-cases-api-getForm-002');
    return buildResponse(404, { error: errorMessage });
  }
  return buildResponse(200, queryResponse[1].Items[0]);
}

export async function getFormRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  return [error, result];
}
