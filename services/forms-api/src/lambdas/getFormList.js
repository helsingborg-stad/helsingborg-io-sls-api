import to from 'await-to-js';
import config from '../libs/config';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

/**
 * Handler function for all forms from the database.
 */
export async function main(_event, context) {
  const params = {
    TableName: config.forms.tableName,
    ProjectionExpression: '#n, description, id, createdAt, updatedAt, subform, formType',
    ExpressionAttributeNames: { '#n': 'name' },
  };
  const [error, queryResponse] = await to(makeScanQuery(params));
  if (error) {
    log.error(
      'Get form list request error',
      context.awsRequestId,
      'service-forms-api-getFormList-001',
      error
    );

    return response.failure({
      status: 400,
      code: 400,
      ...error,
    });
  }
  return response.success(200, { count: queryResponse[1].Count, forms: queryResponse[1].Items });
}

async function makeScanQuery(params) {
  const [error, result] = await to(dynamoDb.call('scan', params));
  return [error, result];
}
