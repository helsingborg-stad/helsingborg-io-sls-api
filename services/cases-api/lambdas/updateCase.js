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
  const decodedToken = decodeToken(event);
  const requestBody = JSON.parse(event.body);
  const { id } = event.pathParameters;

  const { provider, formId, currentPosition, status, details, answers } = requestBody;

  let UpdateExpression = 'SET #updated = :updated';
  const ExpressionAttributeNames = { '#updated': 'updatedAt' };
  const ExpressionAttributeValues = { ':updated': Date.now() };

  if (provider) {
    UpdateExpression += ', #provider = :newProvider';
    ExpressionAttributeNames['#provider'] = 'provider';
    ExpressionAttributeValues[':newProvider'] = provider;
  }

  if (formId) {
    UpdateExpression += ', #formId = :newFormId';
    ExpressionAttributeNames['#formId'] = 'formId';
    ExpressionAttributeValues[':newFormId'] = formId;
  }

  if (currentPosition) {
    UpdateExpression += ', #currentPosition = :newPosition';
    ExpressionAttributeNames['#currentPosition'] = 'currentPosition';
    ExpressionAttributeValues[':newPosition'] = currentPosition;
  }

  if (status) {
    UpdateExpression += ', #status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = status;
  }

  if (details) {
    UpdateExpression += ', #details = :newDetails';
    ExpressionAttributeNames['#details'] = 'details';
    ExpressionAttributeValues[':newDetails'] = details;
  }

  if (answers) {
    UpdateExpression += ', #answers = :newAnswers';
    ExpressionAttributeNames['#answers'] = 'answers';
    ExpressionAttributeValues[':newAnswers'] = answers;
  }

  const { personalNumber } = decodedToken;

  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;

  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: {
      PK,
      SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [error, queryResponse] = await to(sendUpdateCaseRequest(params));
  if (error) {
    return response.failure(error);
  }

  const attributes = objectWithoutProperties(queryResponse.Attributes, ['PK', 'SK']);
  return response.success(200, {
    type: 'updateCase',
    attributes: {
      ...attributes,
    },
  });
}

async function sendUpdateCaseRequest(params) {
  const [error, result] = await to(dynamoDb.call('update', params));
  if (error) {
    throwError(error);
  }

  return result;
}
