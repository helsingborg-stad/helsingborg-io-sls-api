import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { getStatusByType } from '../libs/caseStatuses';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { decideNewCaseStatus, desideNewState } from '../helpers/caseDecision';

import type { CaseStatus } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  caseKeys: CaseKeys;
  workflow: VivaWorkflow;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

interface SuccessEvent {
  caseKeys: CaseKeys;
}

export interface Dependencies {
  putSuccessEvent: (params: SuccessEvent) => Promise<void>;
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
  const { caseKeys, workflow } = input.detail;

  const newStatusType = decideNewCaseStatus(workflow);
  const newState = desideNewState(workflow);

  const isStatusStateUndefined = !(newStatusType && newState);
  if (isStatusStateUndefined) {
    return true;
  }

  const newStatus = getStatusByType(newStatusType);

  await dependencies.updateCase(caseKeys, newStatus, newState);
  await dependencies.putSuccessEvent({ caseKeys });

  return true;
}

export const main = log.wrap(event => {
  return decideCaseStatus(event, {
    putSuccessEvent: putVivaMsEvent.decideCaseStatusSuccess,
    updateCase: updateCaseStatusAndState,
  });
});
