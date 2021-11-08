/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import { getItem as getStoredUserCase } from '../../../libs/queries';
import { statusTypes } from '../../../libs/caseStatuses';
import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import {
  SIX_MONTHS_IN_HOURS,
  FORTY_FIVE_DAYS_IN_HOURS,
  SEVENTY_TWO_HOURS,
} from '../../../libs/constants';

export async function main(event, context) {
  const { caseKeys } = event.detail;
  const { PK, SK } = caseKeys;

  const [getStoredUserCaseError, storedUserCase] = await getStoredUserCase(
    config.cases.tableName,
    PK,
    SK
  );
  if (getStoredUserCaseError) {
    log.error(
      'Error getting stored case from the cases table.',
      context.awsRequestId,
      'service-viva-ms-syncExpiryTime-001',
      getStoredUserCaseError
    );
    return false;
  }

  const expireHours = getExpiryHoursOnStatusType(storedUserCase.Item.status.type);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  const [updateCaseError] = await to(
    updateCaseExpirationTime({
      keys: caseKeys,
      newExpirationTime,
    })
  );
  if (updateCaseError) {
    log.error(
      'Update case error.',
      context.awsRequestId,
      'service-viva-ms-syncExpiryTime-002',
      updateCaseError
    );
    return false;
  }

  return true;
}

function getExpiryHoursOnStatusType(statusType) {
  const statusHourMap = {
    [statusTypes.ACTIVE_ONGOING]: SEVENTY_TWO_HOURS,

    [statusTypes.ACTIVE_SIGNATURE_PENDING]: FORTY_FIVE_DAYS_IN_HOURS,
    [statusTypes.ACTIVE_SIGNATURE_COMPLETED]: FORTY_FIVE_DAYS_IN_HOURS,

    [statusTypes.ACTIVE_SUBMITTED]: FORTY_FIVE_DAYS_IN_HOURS,
    [statusTypes.ACTIVE_PROCESSING]: FORTY_FIVE_DAYS_IN_HOURS,
    [statusTypes.ACTIVE_COMPLETION_REQUIRED_VIVA]: FORTY_FIVE_DAYS_IN_HOURS,

    [statusTypes.CLOSED_APPROVED_VIVA]: SIX_MONTHS_IN_HOURS,
    [statusTypes.CLOSED_PARTIALLY_APPROVED_VIVA]: SIX_MONTHS_IN_HOURS,
    [statusTypes.CLOSED_REJECTED_VIVA]: SIX_MONTHS_IN_HOURS,
    [statusTypes.CLOSED_COMPLETION_REJECTED_VIVA]: SIX_MONTHS_IN_HOURS,
  };

  const hours = statusHourMap[statusType];

  if (!hours) {
    throw `Expiry time not set for status: ${statusType}`;
  }

  return hours;
}

function updateCaseExpirationTime(caseAttributes) {
  const TableName = config.cases.tableName;
  const Key = caseAttributes.keys;
  const UpdateExpression = 'SET expirationTime = :newExpirationTime';
  const ExpressionAttributeValues = {
    ':newExpirationTime': caseAttributes.newExpirationTime,
  };

  const params = {
    TableName,
    Key,
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
