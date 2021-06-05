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

  const { personalNumber } = decodedToken;

  const [getAllUserCasesError, userCases] = await to(getUserCases(personalNumber));
  if (getAllUserCasesError) {
    console.error('getAllUserCasesError', getAllUserCasesError);
    return response.failure(getAllUserCasesError);
  }

  if (userCases.length === 0) {
    return response.failure(new ResourceNotFoundError('No user cases found'));
  }

  const cases = userCases.map(item => objectWithoutProperties(item, ['PK', 'SK', 'GSI1']));

  return response.success(200, {
    type: 'getCases',
    attributes: {
      cases,
    },
  });
}

async function getUserCases(personalNumber) {
  const [getApplicantCasesError, applicantCasesResult] = await to(
    getApplicantCases(personalNumber)
  );
  if (getApplicantCasesError) {
    console.error('getApplicantCasesError', getApplicantCasesError);
    throwError(getApplicantCasesError.statusCode, getApplicantCasesError.message);
  }

  const [getCoApplicantCasesError, coApplicantCasesResult] = await to(
    getCoApplicantCases(personalNumber)
  );
  if (getCoApplicantCasesError) {
    console.error('getCoApplicantCasesError', getCoApplicantCasesError);
    throwError(getCoApplicantCasesError.statusCode, getCoApplicantCasesError.message);
  }

  const concatAndDeDuplicateCases = (...cases) => [...new Set([].concat(...cases))];
  return concatAndDeDuplicateCases(applicantCasesResult.Items, coApplicantCasesResult.Items);
}

async function getApplicantCases(personalNumber) {
  const PK = `USER#${personalNumber}`;
  const SK = PK;

  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', params);
}

async function getCoApplicantCases(personalNumber) {
  const GSI1 = `USER#${personalNumber}`;

  const params = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
    },
  };

  return dynamoDb.call('query', params);
}
