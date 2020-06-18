// todo: move to libs

import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Get request towards dynomdb to retrive an item in a table.
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 */
export async function getItem(TableName, PK, SK) {
  const params = {
    TableName,
    Key: {
      PK,
      SK: SK || PK,
    },
  };

  return await to(dynamoDb.call('get', params));
}

/**
 * Creating a new item in a dynamodb table.
 * @param {object} params The request params for the creation of a new item in a dynamodb table.
 */
export async function putItem(params) {
  const [error, dynamoDbResponse] = await to(dynamoDb.call('put', params));
  if (error) throwError(error.statusCode);

  return dynamoDbResponse;
}

/**
 * Checks if a item exists in a dynamoDB table.
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 * @param {string} errorMessage The error message to pass if a item does not exists
 */
export async function itemExists(
  TableName,
  PK,
  SK,
  errorMessage = 'The requested item does not exists'
) {
  const [error, response] = await getItem(TableName, PK, SK);
  if (error) throwError(error.statusCode);

  if (Object.keys(response).length === 0 && response.constructor === Object) {
    throwError(404, errorMessage);
  }

  return response;
}
