import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { VIVA_APPLICATION_LOCKED } from '../libs/constants';
import { getStatusByType } from '../libs/caseStatuses';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import decideNewCaseStatus from '../helpers/caseDecision';

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
  updateCase: (keys: CaseKeys, newStatus: CaseStatus) => Promise<void>;
}

function updateCaseStatusAndState(keys: CaseKeys, newStatus: CaseStatus): Promise<void> {
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
      ':newState': VIVA_APPLICATION_LOCKED,
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
  if (newStatusType == undefined) {
    return true;
  }

  await dependencies.updateCase(caseKeys, getStatusByType(newStatusType));
  await dependencies.putSuccessEvent({ caseKeys });

  return true;
}

export const main = log.wrap(event => {
  return decideCaseStatus(event, {
    putSuccessEvent: putVivaMsEvent.decideCaseStatusSuccess,
    updateCase: updateCaseStatusAndState,
  });
});
