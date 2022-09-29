import log from '../libs/logs';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import { cases } from '../helpers/query';
import { updateCaseExpirationTime } from '../helpers/dynamoDb';
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
  updateCase: (caseKeys: CaseKeys, newWorkflowId: string) => Promise<void>;
}

export async function syncExpiryTime(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { caseKeys } = input.detail;

  const userCase = await dependencies.getCase(caseKeys);
  const expireHours = expiryTime.getHoursOnStatusType(userCase.status.type);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  await updateCaseExpirationTime({ caseKeys, newExpirationTime });

  return true;
}

export const main = log.wrap(event => {
  return syncExpiryTime(event, {
    getCase: cases.get,
    updateCase: updateCaseExpirationTime,
  });
});
