import AWS from 'aws-sdk';
import * as dynamoDb from '../../../libs/dynamoDb';
import to from 'await-to-js';

import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import { objectWithoutProperties } from '../../../libs/objects';

import {
  VIVA_CASE_SUBMITTED_EXPIRATION_HOURS,
  VIVA_CASE_ONGOING_EXPIRATION_HOURS,
} from '../../../libs/constants';

import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import config from '../../../config';

import * as response from '../../../libs/response';

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  const unMarshalledCaseData = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);
  const expireHours = getExpiryHoursByStatus(unMarshalledCaseData.status.type);

  const UpdateExpression = ['SET updatedAt = :newUpdatedAt'];
  const ExpressionAttributeValues = { ':newUpdatedAt': Date.now() };

  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  UpdateExpression.push('expirationTime = :newExpirationTime');
  ExpressionAttributeValues[':newExpirationTime'] = newExpirationTime;

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: unMarshalledCaseData.PK,
      SK: unMarshalledCaseData.SK,
    },
    UpdateExpression: UpdateExpression.join(', '),
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [updateCaseError, updateCaseResponse] = await to(updateCase(params));
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

function getExpiryHoursByStatus(status) {
  const hours = {
    'active:ongoing': VIVA_CASE_ONGOING_EXPIRATION_HOURS,
    'active:submitted:viva': VIVA_CASE_SUBMITTED_EXPIRATION_HOURS,
  }[status];

  if (!hours) {
    throwError(422, 'Expiry time not set for status!');
  }

  return hours;
}

async function updateCase(params) {
  const [dynamoDbUpdateCallError, dynamoDbUpdateResult] = await to(dynamoDb.call('update', params));
  if (dynamoDbUpdateCallError) {
    throwError(dynamoDbUpdateCallError.statusCode, dynamoDbUpdateCallError.message);
  }

  return dynamoDbUpdateResult;
}
