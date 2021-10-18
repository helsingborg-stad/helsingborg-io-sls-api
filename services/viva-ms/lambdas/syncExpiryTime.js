/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import { getItem as getStoredUserCase } from '../../../libs/queries';
import { statusTypes } from '../../../libs/caseStatuses';
import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import {
  DELETE_VIVA_CASE_AFTER_6_MONTH as AFTER_6_MONTH,
  DELETE_VIVA_CASE_AFTER_45_DAYS as AFTER_45_DAYS,
  DELETE_VIVA_CASE_AFTER_72_HOURS as AFTER_3_DAYS,
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

  const [updateCaseError, updatedCase] = await to(
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

  log.info(
    'Case attribute: expirationTime, updated successfully',
    context.awsRequestId,
    null,
    updatedCase
  );
  return true;
}

function getExpiryHoursOnStatusType(statusType) {
  const statusHourMap = {
    [statusTypes.ACTIVE_ONGOING]: AFTER_3_DAYS,

    [statusTypes.ACTIVE_SIGNATURE_PENDING]: AFTER_45_DAYS,
    [statusTypes.ACTIVE_SIGNATURE_COMPLETED]: AFTER_45_DAYS,

    [statusTypes.ACTIVE_SUBMITTED]: AFTER_45_DAYS,
    [statusTypes.ACTIVE_PROCESSING]: AFTER_45_DAYS,
    [statusTypes.ACTIVE_COMPLETION_REQUIRED_VIVA]: AFTER_45_DAYS,

    [statusTypes.CLOSED_APPROVED_VIVA]: AFTER_6_MONTH,
    [statusTypes.CLOSED_PARTIALLY_APPROVED_VIVA]: AFTER_6_MONTH,
    [statusTypes.CLOSED_REJECTED_VIVA]: AFTER_6_MONTH,
    [statusTypes.CLOSED_COMPLETION_REJECTED_VIVA]: AFTER_6_MONTH,
  };

  const hours = statusHourMap[statusType];

  if (!hours) {
    console.log('(Viva-ms: syncExpiryTime) getExpiryHoursOnStatusType', statusType);
    throw 'Expiry time not set for status!';
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
