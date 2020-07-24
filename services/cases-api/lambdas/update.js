import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Handler function for updating user case by id from dynamodb
 * Can update the data (i.e. the answers), and change the status of the case.
 */
export async function main(event) {
  const { caseId } = event.pathParameters;
  const userId = event.headers.Authorization;
  const casePartitionKey = `USER#${userId}`;
  const caseSortKey = `${casePartitionKey}#CASE#${caseId}`;

  const requestBody = JSON.parse(event.body);
  let keyCounter = 0;
  let UpdateExpression = 'SET ';
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  //if we sent a status, then we update it.
  if (requestBody.status) {
    UpdateExpression += '#status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = requestBody.status;
  }
  if (requestBody.status && requestBody.currentPage) UpdateExpression += ', ';
  if (requestBody.currentPage) {
    UpdateExpression += '#currentPage = :newPage';
    ExpressionAttributeNames['#currentPage'] = 'currentPage';
    ExpressionAttributeValues[':newPage'] = requestBody.currentPage;
  }
  const data = requestBody.data || {};
  //update the data (answers) only if we've sent some.
  if (Object.keys(data).length > 0) {
    if (requestBody.currentPage) {
      UpdateExpression += ', ';
    }
    ExpressionAttributeNames['#data'] = 'data';
    const numberValues = Object.keys(data).length;
    for (const key in data) {
      UpdateExpression +=
        '#data.#key' +
        keyCounter +
        ' = :value' +
        keyCounter +
        (keyCounter === numberValues - 1 ? '' : ', '); //No comma on the last line.
      ExpressionAttributeNames['#key' + keyCounter] = key;
      ExpressionAttributeValues[':value' + keyCounter] = data[key];
      keyCounter++;
    }
  }
  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: casePartitionKey,
      SK: caseSortKey,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [error, queryResponse] = await to(sendUpdateCaseRequest(params));
  if (error) return response.failure(error);

  return response.success(200, {
    caseId,
    personalNumber: userId,
    type: queryResponse.Attributes.type,
    status: queryResponse.Attributes.status,
    data: queryResponse.Attributes.data,
  });
}

async function sendUpdateCaseRequest(params) {
  const [error, result] = await to(dynamoDb.call('update', params));
  if (error) throwError(error.statusCode);
  return result;
}
