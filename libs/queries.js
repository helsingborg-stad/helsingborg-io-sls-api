import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as dynamoDb from './dynamoDb';

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

/**
 * Append a new item to a list in an item
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 * @param {string} listName The attribute name of the list
 * @param {any} item The item to append to the list
 */
export async function appendItemToList(tableName, PK, listName, item) {
  const params = {
    TableName: tableName,
    Key: { PK },
    UpdateExpression: 'SET #list = list_append(#list, :vals)',
    ExpressionAttributeNames: {
      '#list': listName,
    },
    ExpressionAttributeValues: {
      ':vals': [item],
    },
    ReturnValues: 'ALL_NEW',
  };
  const [error, dynamoDbResponse] = await to(dynamoDb.call('update', params));
  if (error) throwError(error.statusCode, error.message);

  return dynamoDbResponse;
}

export async function updateItem(TableName, PK, keys, validKeys) {
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  const UpdateExpression = createUpdateExpression(
    validKeys,
    keys,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  );

  const params = {
    TableName,
    Key: {
      PK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [error, dynamoDbResponse] = await to(dynamoDb.call('update', params));
  if (error) throwError(error.statusCode, error.message);

  return dynamoDbResponse;
}

export function createUpdateExpression(
  validKeys,
  keys,
  ExpressionAttributeNames,
  ExpressionAttributeValues
) {
  let UpdateExpression = 'SET ';
  let keyCounter = Object.keys(keys).length;

  if (keyCounter > 0) {
    for (const key in keys) {
      // Prevent creation of invalid attributes.
      if (!validKeys.includes(key)) {
        throwError(404, 'Invalid DynamoDB update');
        // TODO: Return error.
      }

      UpdateExpression += `#${key} = :new${key}`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:new${key}`] = keys[key];

      if (keyCounter > 1) {
        UpdateExpression += ', ';
        keyCounter--;
      }
    }
  }

  return UpdateExpression;
}
