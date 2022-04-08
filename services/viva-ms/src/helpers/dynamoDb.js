import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import { CASE_HTML_GENERATED } from '../libs/constants';

import caseHelper from './createCase';

export function getClosedUserCases(partitionKey) {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': partitionKey,
      ':statusTypeClosed': 'closed',
    },
  };
  return dynamoDb.call('query', queryParams);
}

export function updateVivaCaseState(caseItem) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
    UpdateExpression: 'SET #state = :newState',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newState': CASE_HTML_GENERATED,
    },
    ReturnValues: 'NONE',
  };
  return dynamoDb.call('update', updateParams);
}

export function updateCaseExpirationTime(caseUpdateParams) {
  const { caseKeys, newExpirationTime } = caseUpdateParams;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET expirationTime = :newExpirationTime',
    ExpressionAttributeValues: {
      ':newExpirationTime': newExpirationTime,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export function getCaseListOnPeriod(vivaPerson) {
  const personalNumber = caseHelper.stripNonNumericalCharacters(vivaPerson.case.client.pnumber);
  const { startDate, endDate } = caseHelper.getPeriodInMilliseconds(vivaPerson);

  const casesQueryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      'details.period.startDate = :periodStartDate AND details.period.endDate = :periodEndDate',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':periodStartDate': startDate,
      ':periodEndDate': endDate,
    },
  };

  return dynamoDb.call('query', casesQueryParams);
}
