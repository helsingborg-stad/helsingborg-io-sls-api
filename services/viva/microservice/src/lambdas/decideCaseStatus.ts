import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { getStatusByType } from '../libs/caseStatuses';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { decideNewCaseStatus, decideNewState } from '../helpers/caseDecision';
import { cases } from '../helpers/query';
import type { CaseItem, CaseStatus } from '../types/caseItem';

type SuccessEvent = LambdaDetail;

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  caseKeys: CaseKeys;
  caseState: string;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  triggerEvent: (params: SuccessEvent) => Promise<void>;
  updateCase: (keys: CaseKeys, newStatus: CaseStatus, newState: string) => Promise<void>;
}

function updateCaseStatusAndState(
  keys: CaseKeys,
  newStatus: CaseStatus,
  newState: string
): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET #status = :newStatusType, #state = :newState',
    ExpressionAttributeNames: { '#status': 'status', '#state': 'state' },
    ExpressionAttributeValues: {
      ':newStatusType': newStatus,
      ':newState': newState,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function decideCaseStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { caseKeys, caseState } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);
  const newStatusType = decideNewCaseStatus(caseItem.details?.workflow);
  const newState = decideNewState(caseItem.details?.workflow);

  const isStatusStateUndefined = !(newStatusType && newState);
  if (isStatusStateUndefined) {
    await dependencies.triggerEvent({ caseKeys, caseState });
    return true;
  }

  const newStatus = getStatusByType(newStatusType);

  await dependencies.updateCase(caseKeys, newStatus, newState);
  await dependencies.triggerEvent({ caseKeys, caseState: newState });

  return true;
}

export const main = log.wrap(event => {
  return decideCaseStatus(event, {
    getCase: cases.get,
    updateCase: updateCaseStatusAndState,
    triggerEvent: putVivaMsEvent.decideCaseStatusSuccess,
  });
});
