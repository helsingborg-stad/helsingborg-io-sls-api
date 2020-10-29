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
  const decodedToken = decodeToken(event);
  const { id } = event.pathParameters;

  const { personalNumber } = decodedToken;

  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;

  const TableName = config.cases.tableName;

  const params = {
    TableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    Limit: 1,
  };

  const [error, caseGetResponse] = await to(sendGetCaseRequest(params));
  if (error) {
    return response.failure(error);
  }

  if (!caseGetResponse.Count) {
    return response.success(404, {
      type: 'getCase',
      attributes: {
        message: `Case with id: ${id} not found`,
      },
    });
  }

  const [item] = caseGetResponse.Items;
  const attributes = objectWithoutProperties(item, ['PK', 'SK']);

  return response.success(200, {
    type: 'getCase',
    attributes: {
      ...attributes,
    },
  });
}

async function sendGetCaseRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  if (error) {
    throwError(error);
  }
  return result;
}
