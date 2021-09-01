/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError, ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';
import { logError } from '../../../libs/logs';

export async function main(event, context) {
  const decodedToken = decodeToken(event);
  const { id } = event.pathParameters;

  const [getUserCaseError, userCase] = await to(getUserCase(decodedToken.personalNumber, id));
  if (getUserCaseError) {
    logError(
      'Get user case error',
      context.awsRequestId,
      'service-cases-api-getCase-001',
      getUserCaseError
    );

    return response.failure(getUserCaseError);
  }

  if (!userCase) {
    const errorMessage = `User case with id: ${id} not found`;
    logError(errorMessage, context.awsRequestId, 'service-cases-api-getCase-002');

    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  const userCaseWithoutKeys = objectWithoutProperties(userCase, ['PK', 'SK', 'GSI1']);

  return response.success(200, {
    type: 'getCase',
    attributes: {
      ...userCaseWithoutKeys,
    },
  });
}

async function getUserCase(personalNumber, id) {
  const [getUserApplicantCaseError, userApplicantCaseResult] = await to(
    getUserApplicantCase(personalNumber, id)
  );
  if (getUserApplicantCaseError) {
    console.error('getUserApplicantCaseError', getUserApplicantCaseError);
    throwError(getUserApplicantCaseError.statusCode, getUserApplicantCaseError.message);
  }

  const [getCoApplicantCaseError, userCoApplicantCaseResult] = await to(
    getUserCoApplicantCase(personalNumber, id)
  );
  if (getCoApplicantCaseError) {
    console.error('getCoApplicantCaseError', getCoApplicantCaseError);
    throwError(getCoApplicantCaseError.statusCode, getCoApplicantCaseError.message);
  }

  const concatAndDeDuplicateCase = (...userCaseList) => [...new Set([].concat(...userCaseList))];
  const userCaseList = concatAndDeDuplicateCase(
    userApplicantCaseResult.Items,
    userCoApplicantCaseResult.Items
  );

  const [userCase] = userCaseList.filter(Boolean);
  return userCase;
}

async function getUserApplicantCase(personalNumber, id) {
  const PK = `USER#${personalNumber}`;
  const SK = `CASE#${id}`;

  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    Limit: 1,
  };

  return dynamoDb.call('query', params);
}

async function getUserCoApplicantCase(personalNumber, id) {
  const GSI1 = `USER#${personalNumber}`;
  const SK = `CASE#${id}`;

  const params = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1 AND SK = :sk',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':sk': SK,
    },
    Limit: 1,
  };

  return dynamoDb.call('query', params);
}
