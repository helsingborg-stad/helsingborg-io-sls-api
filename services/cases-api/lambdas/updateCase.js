/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError, BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

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

  const { provider, status, details, currentFormId, currentPosition, answers } = requestBody;

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

  if (currentFormId) {
    UpdateExpression += ', #currentFormId = :newCurrentFormId';
    ExpressionAttributeNames['#currentFormId'] = 'currentFormId';
    ExpressionAttributeValues[':newCurrentFormId'] = currentFormId;
  }

  if (currentPosition || answers) {
    if (!currentFormId) {
      return response.failure(
        new BadRequestError(`currentFormId is needed when updating currentPosition and/or answers`)
      );
    }

    ExpressionAttributeNames['#formId'] = currentFormId;

    if (currentPosition) {
      UpdateExpression += ', forms.#formId.currentPosition = :newCurrentPosition';
      ExpressionAttributeValues[':newCurrentPosition'] = currentPosition;
    }

    if (answers) {
      UpdateExpression += ', forms.#formId.answers = :newAnswers';
      ExpressionAttributeValues[':newAnswers'] = answers;
    }
  }

  const { personalNumber } = decodedToken;

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: `USER#${personalNumber}`,
      SK: `USER#${personalNumber}#CASE#${id}`,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [updateCaseError, updateCaseResponse] = await to(sendUpdateCaseRequest(params));
  if (updateCaseError) {
    return response.failure(updateCaseError);
  }

  const attributes = objectWithoutProperties(updateCaseResponse.Attributes, ['PK', 'SK']);
  return response.success(200, {
    type: 'updateCase',
    attributes: {
      ...attributes,
    },
  });
}

async function sendUpdateCaseRequest(params) {
  const [dynamoDbUpdateCallError, dynamoDbUpdateResult] = await to(dynamoDb.call('update', params));
  if (dynamoDbUpdateCallError) {
    throwError(dynamoDbUpdateCallError.statusCode, dynamoDbUpdateCallError.message);
  }

  return dynamoDbUpdateResult;
}
