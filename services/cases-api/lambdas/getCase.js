/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError, ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';

export async function main(event) {
  const decodedToken = decodeToken(event);
  const { id } = event.pathParameters;

  const [getUserCaseError, userCase] = await to(getUserCase(decodedToken.personalNumber, id));
  if (getUserCaseError) {
    return response.failure(getUserCaseError);
  }

  if (userCase == undefined) {
    return response.failure(new ResourceNotFoundError(`User case with id: ${id} not found`));
  }

  const userCaseWithoutPK_SK_GSI1 = objectWithoutProperties(userCase, ['PK', 'SK', 'GSI1']);

  return response.success(200, {
    type: 'getCase',
    attributes: {
      ...userCaseWithoutPK_SK_GSI1,
    },
  });
}

async function getUserCase(personalNumber, id) {
  const [getApplicantCaseError, applicantCaseResult] = await to(
    getApplicantCase(personalNumber, id)
  );
  if (getApplicantCaseError) {
    console.error('getApplicantCaseError', getApplicantCaseError);
    throwError(getApplicantCaseError.statusCode, getApplicantCaseError.message);
  }

  const [getCoApplicantCaseError, coApplicantCaseResult] = await to(
    getCoApplicantCase(personalNumber, id)
  );
  if (getCoApplicantCaseError) {
    console.error('getCoApplicantCaseError', getCoApplicantCaseError);
    throwError(getCoApplicantCaseError.statusCode, getCoApplicantCaseError.message);
  }

  const concatAndDeDuplicateCase = (...userCases) => [...new Set([].concat(...userCases))];
  const userCases = concatAndDeDuplicateCase(
    applicantCaseResult.Items,
    coApplicantCaseResult.Items
  );

  const [userCase] = userCases.filter(Boolean);
  return userCase;
}

async function getApplicantCase(personalNumber, id) {
  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;

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

async function getCoApplicantCase(personalNumber, id) {
  const GSI1 = `USER#${personalNumber}`;

  const params = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1',
    FilterExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':id': id,
    },
    Limit: 1,
  };

  return dynamoDb.call('query', params);
}
