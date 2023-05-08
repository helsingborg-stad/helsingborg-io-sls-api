import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { getStatusByType } from '../libs/caseStatuses';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { decideNewCaseStatus, decideNewState } from '../helpers/caseDecision';
import { cases } from '../helpers/query';
import type { CaseItem, CaseStatus } from '../types/caseItem';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

type SuccessEvent = LambdaDetail;

interface CaseKeys {
  PK: string;
  SK: string;
}

export interface LambdaDetail {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
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
  const { caseKeys } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);
  const currentCaseStatusType = caseItem.status.type;
  const currentCaseState = caseItem.state;

  const newStatusType = decideNewCaseStatus(caseItem.details?.workflow) ?? currentCaseStatusType;
  const newState = decideNewState(caseItem.details?.workflow) ?? currentCaseState;

  const newStatus = getStatusByType(newStatusType);
  await dependencies.updateCase(caseKeys, newStatus, newState);
  await dependencies.triggerEvent({
    ...input.detail,
    caseState: newState,
    caseStatusType: newStatusType,
  });

  return true;
}

export const main = log.wrap(event => {
  return decideCaseStatus(event, {
    getCase: cases.get,
    updateCase: updateCaseStatusAndState,
    triggerEvent: putVivaMsEvent.decideCaseStatusSuccess,
  });
});
