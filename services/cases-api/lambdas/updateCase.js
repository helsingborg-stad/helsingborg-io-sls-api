import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';

import { getFutureTimestamp, millisecondsToSeconds } from '../helpers/timestampHelper';
import { CASE_EXPIRATION_HOURS } from '../../../libs/constants';

export async function main(event) {
  const decodedToken = decodeToken(event);
  const requestBody = JSON.parse(event.body);
  const { id } = event.pathParameters;

  const { provider, status, details, currentFormId, answers } = requestBody;

  let UpdateExpression = 'SET #updated = :updated';
  const ExpressionAttributeNames = { '#updated': 'updatedAt' };
  const ExpressionAttributeValues = { ':updated': Date.now() };

  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(CASE_EXPIRATION_HOURS));
  UpdateExpression += ', #expirationTime = :newExpirationTime';
  ExpressionAttributeNames['#expirationTime'] = 'expirationTime';
  ExpressionAttributeValues[':newExpirationTime'] = newExpirationTime;

  if (provider) {
    UpdateExpression += ', #provider = :newProvider';
    ExpressionAttributeNames['#provider'] = 'provider';
    ExpressionAttributeValues[':newProvider'] = provider;
  }

  if (currentFormId) {
    UpdateExpression += ', #currentFormId = :newCurrentFormId';
    ExpressionAttributeNames['#currentFormId'] = 'currentFormId';
    ExpressionAttributeValues[':newCurrentFormId'] = currentFormId;
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
