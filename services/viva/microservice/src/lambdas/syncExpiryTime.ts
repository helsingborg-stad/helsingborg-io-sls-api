import log from '../libs/logs';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import { cases } from '../helpers/query';
import expiryTime from '../helpers/caseExpiryTime';

import type { CaseItem } from '../types/caseItem';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  caseKeys: CaseKeys;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  updateCase: (keys: CaseKeys, time: number) => Promise<void>;
}

function updateCaseExpirationTime(keys: CaseKeys, newExpirationTime: number): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET expirationTime = :newExpirationTime, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':newExpirationTime': newExpirationTime,
      ':updatedAt': Date.now(),
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function syncExpiryTime(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { caseKeys } = input.detail;

  const userCase = await dependencies.getCase(caseKeys);
  const expireHours = expiryTime.getHoursOnStatusType(userCase.status.type);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  await dependencies.updateCase(caseKeys, newExpirationTime);

  return true;
}

export const main = log.wrap(event => {
  return syncExpiryTime(event, {
    getCase: cases.get,
    updateCase: updateCaseExpirationTime,
  });
});
