import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { objectWithoutProperties } from '../../../libs/objects';
import { decodeToken } from '../../../libs/token';

/**
 * Handler function for retrieving user case by id from dynamodb
 */
export async function main(event) {
  const { caseId } = event.pathParameters;
  const decodedToken = decodeToken(event);

  const casePartitionKey = `USER#${decodedToken.personalNumber}`;
  const caseSortKey = `${casePartitionKey}#CASE#${caseId}`;

  const params = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': casePartitionKey,
      ':sk': caseSortKey,
    },
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  };

  const [error, queryResponse] = await to(sendGetCaseRequest(params));
  if (error) return response.failure(error);

  if (queryResponse.Count > 0) {
    const [item] = queryResponse.Items;
    const { id, ...attributes } = objectWithoutProperties(item, [
      'ITEM_TYPE',
      // 'updatedAt',
      // 'createdAt',
      'PK',
      'SK',
    ]);

    return response.success(200, {
      type: 'cases',
      id,
      attributes,
    });
  } else {
    return response.success(200, {
      type: 'cases',
      message: 'Items not found',
    });
  }
}

async function sendGetCaseRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  if (error) throwError(error.statusCode);
  return result;
}
