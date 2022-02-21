import to from 'await-to-js';
import {
  throwError,
  ResourceNotFoundError,
  InternalServerError
} from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import { putEvent } from '../libs/awsEventBridge';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import { decodeToken } from '../libs/token';
import { objectWithoutProperties } from '../libs/objects';
import log from '../libs/logs';

export async function main(event, context) {
  const decodedToken = decodeToken(event);

  const { personalNumber } = decodedToken;

  const [putEventError] = await to(
    putEvent(
      { personalNumber },
      'casesApiInvokeSuccess',
      'casesApi.getCaseList'
    )
  );
  if (putEventError) {
    log.error(
      'Error put event [casesApiInvokeSuccess]',
      context.awsRequestId,
      'service-cases-api-getCaseList-003',
      putEventError
    );
    return response.failure(new InternalServerError(putEventError));
  }

  const [getUserCaseListError, userCaseList] = await to(getUserCaseList(personalNumber));
  if (getUserCaseListError) {
    log.error(
      'Get User Case list error',
      context.awsRequestId,
      'service-cases-api-getCaseList-001',
      getUserCaseListError
    );

    return response.failure(new InternalServerError(getUserCaseListError));
  }

  if (userCaseList.length === 0) {
    const errorMessage = 'No user cases found';
    log.error(errorMessage, context.awsRequestId, 'service-cases-api-getCaseList-002');

    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  const userCaseListWithoutKeys = userCaseList.map(item =>
    objectWithoutProperties(item, ['PK', 'SK', 'GSI1'])
  );

  return response.success(200, {
    type: 'getCases',
    attributes: {
      cases: userCaseListWithoutKeys,
    },
  });
}

async function getUserCaseList(personalNumber) {
  const [getUserApplicantCaseListError, applicantCaseListResult] = await to(
    getUserApplicantCaseList(personalNumber)
  );
  if (getUserApplicantCaseListError) {
    throwError(getUserApplicantCaseListError.statusCode, getUserApplicantCaseListError.message);
  }

  const [getUserCoApplicantCaseListError, coApplicantCaseListResult] = await to(
    getUserCoApplicantCaseList(personalNumber)
  );
  if (getUserCoApplicantCaseListError) {
    throwError(getUserCoApplicantCaseListError.statusCode, getUserCoApplicantCaseListError.message);
  }

  const concatAndDeDuplicateCaseList = (...cases) => [...new Set([].concat(...cases))];
  return concatAndDeDuplicateCaseList(
    applicantCaseListResult.Items,
    coApplicantCaseListResult.Items
  );
}

function getUserApplicantCaseList(personalNumber) {
  const PK = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', queryParams);
}

function getUserCoApplicantCaseList(personalNumber) {
  const GSI1 = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1 AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', queryParams);
}
