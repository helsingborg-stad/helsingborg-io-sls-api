import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';

/**
 * Handler function for updating user case by id from dynamodb
 * Can update the data (i.e. the answers), and change the status of the case.
 */
export async function main(event) {
  const { caseId } = event.pathParameters;
  const decodedToken = decodeToken(event);

  const casePartitionKey = `USER#${decodedToken.personalNumber}`;
  const caseSortKey = `${casePartitionKey}#CASE#${caseId}`;

  const requestBody = JSON.parse(event.body);
  let keyCounter = 0;
  let UpdateExpression = 'SET #updated = :updated';
  const ExpressionAttributeNames = { '#updated': 'updatedAt' };
  const ExpressionAttributeValues = { ':updated': Date.now() };
  //if we sent a status, then we update it.
  if (requestBody.status) {
    UpdateExpression += ', #status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = requestBody.status;
  }
  if (requestBody.currentStep) {
    UpdateExpression += ', #currentStep = :newStep';
    ExpressionAttributeNames['#currentStep'] = 'currentStep';
    ExpressionAttributeValues[':newStep'] = requestBody.currentStep;
  }
  const data = requestBody.data || {};
  //update the data (answers) only if we've sent some.
  if (Object.keys(data).length > 0) {
    if (requestBody.currentStep || requestBody.status) {
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

  const attributes = objectWithoutProperties(queryResponse.Attributes, ['ITEM_TYPE', 'PK', 'SK']);
  return response.success(200, {
    type: 'cases',
    id: caseId,
    attributes: {
      personalNumber: decodedToken.personalNumber,
      ...attributes,
    },
  });
}

async function sendUpdateCaseRequest(params) {
  const [error, result] = await to(dynamoDb.call('update', params));
  if (error) throwError(error.statusCode);
  return result;
}
