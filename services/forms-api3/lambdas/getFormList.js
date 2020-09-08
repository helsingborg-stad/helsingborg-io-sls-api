import to from 'await-to-js';
import config from '../../../config';
import { buildResponse } from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Handler function for all forms from the database.
 */
export async function main(event) {
  const params = {
    TableName: config.forms3.tableName,
    ProjectionExpression: '#n, description, id, createdAt, updatedAt, subform, formType',
    ExpressionAttributeNames: { '#n': 'name' },
  };
  const [error, queryResponse] = await to(makeScanQuery(params));
  if (error) return buildResponse(400, error);

  return buildResponse(200, { count: queryResponse[1].Count, forms: queryResponse[1].Items });
}

async function makeScanQuery(params) {
  const [error, result] = await to(dynamoDb.call('scan', params));
  return [error, result];
}
