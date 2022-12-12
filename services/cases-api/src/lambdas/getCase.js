import to from 'await-to-js';
import { throwError, ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import { decodeToken } from '../libs/token';
import { objectWithoutProperties } from '../libs/objects';
import log from '../libs/logs';

export async function main(event) {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken;
  const { id } = event.pathParameters;

  const [getUserCaseError, userCase] = await to(getUserCase(personalNumber, id));
  if (getUserCaseError) {
    log.writeError('Get user case error', getUserCaseError);
    return response.failure(getUserCaseError);
  }

  if (!userCase) {
    const errorMessage = `User case with id: ${id} not found`;
    log.writeInfo(errorMessage, userCase);
    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  const userCaseWithoutKeys = objectWithoutProperties(userCase, ['PK', 'SK', 'GSI1']);

  return response.success(200, {
    type: 'getCase',
    attributes: {
      case: userCaseWithoutKeys,
    },
  });
}

async function getUserCase(personalNumber, id) {
  const [getUserApplicantCaseError, userApplicantCaseResult] = await to(
    getUserApplicantCase(personalNumber, id)
  );
  if (getUserApplicantCaseError) {
    throwError(getUserApplicantCaseError.statusCode, getUserApplicantCaseError.message);
  }

  const [getCoApplicantCaseError, userCoApplicantCaseResult] = await to(
    getUserCoApplicantCase(personalNumber, id)
  );
  if (getCoApplicantCaseError) {
    throwError(getCoApplicantCaseError.statusCode, getCoApplicantCaseError.message);
  }

  // eslint-disable-next-line func-style
  const concatAndDeDuplicateCase = (...cases) => [...new Set([].concat(...cases))];
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
