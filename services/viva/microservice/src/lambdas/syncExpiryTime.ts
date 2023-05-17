import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import putVivaMsEvent from 'helpers/putVivaMsEvent';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import expiryTime from '../helpers/caseExpiryTime';

interface SuccessEvent {
  caseKeys: CaseKeys;
  caseStatusType: string;
  caseState: string;
  expirationTime: number;
}

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  caseKeys: CaseKeys;
  caseStatusType: string;
  caseState: string;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  triggerEvent: (params: SuccessEvent) => Promise<void>;
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
  const { caseKeys, caseStatusType } = input.detail;

  const expireHours = expiryTime.getHoursOnStatusType(caseStatusType);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  await dependencies.updateCase(caseKeys, newExpirationTime);

  await dependencies.triggerEvent({
    ...input.detail,
    expirationTime: newExpirationTime,
  });

  return true;
}

export const main = log.wrap(event =>
  syncExpiryTime(event, {
    triggerEvent: putVivaMsEvent.syncExpiryTimeSuccess,
    updateCase: updateCaseExpirationTime,
  })
);
