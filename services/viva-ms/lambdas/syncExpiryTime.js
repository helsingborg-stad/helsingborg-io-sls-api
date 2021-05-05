/* eslint-disable no-console */
import to from 'await-to-js';
import * as dynamoDb from '../../../libs/dynamoDb';

import config from '../../../config';
import params from '../../../libs/params';

import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import {
  DELETE_VIVA_CASE_AFTER_45_DAYS,
  DELETE_VIVA_CASE_AFTER_72_HOURS,
} from '../../../libs/constants';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const { caseKeys } = event.detail;

  const [getCaseError, getCaseResponse] = await to(getCase(caseKeys));
  if (getCaseError) {
    throw getCaseError;
  }

  const caseItem = getCaseResponse.Items[0];

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  if (vivaCaseSSMParams.recurringFormId !== caseItem.currentFormId) {
    console.info('(Viva-ms: syncExpiryTime): case is not an recurring form. Nothing to update.');
    return true;
  }

  const expireHours = getExpiryHoursByStatusType(caseItem.status.type);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  const [updateCaseError, updatedCase] = await to(
    updateCaseExpirationTimeAttribute(caseKeys, newExpirationTime)
  );
  if (updateCaseError) {
    throw updateCaseError;
  }

  console.info('(Viva-ms: syncExpiryTime): case updated successfully.', updatedCase);

  return true;
}

function getExpiryHoursByStatusType(statusType) {
  const statusHourMap = {
    'active:ongoing': DELETE_VIVA_CASE_AFTER_72_HOURS,
    'active:submitted:viva': DELETE_VIVA_CASE_AFTER_45_DAYS,
  };

  const hours = statusHourMap[statusType];

  if (!hours) {
    console.log('(Viva-ms: syncExpiryTime):', statusType);
    throw 'Expiry time not set for status!';
  }

  return hours;
}

async function getCase(keys) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': keys.PK,
      ':sk': keys.SK,
    },
  };

  return dynamoDb.call('query', params);
}

async function updateCaseExpirationTimeAttribute(keys, newExpirationTime) {
  const TableName = config.cases.tableName;
  const UpdateExpression = 'SET expirationTime = :newExpirationTime';
  const ExpressionAttributeValues = { ':newExpirationTime': newExpirationTime };

  const params = {
    TableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
