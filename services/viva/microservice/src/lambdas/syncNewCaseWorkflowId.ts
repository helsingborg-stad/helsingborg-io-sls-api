import to from 'await-to-js';
import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';

import { cases } from '../helpers/query';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

import type { CaseItem } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';
import type { VivaApplicationStatus } from '../types/vivaMyPages';

export interface WorkflowResult {
  attributes: VivaWorkflow;
}

interface CaseKeys {
  PK: string;
  SK?: string;
}

interface User {
  personalNumber: string;
}

interface LambdaDetails {
  user: User;
  status: VivaApplicationStatus[];
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

interface SuccessEvent {
  vivaApplicantStatusCodeList: VivaApplicationStatus[];
  caseKeys: CaseKeys;
  user: User;
  workflowId: string;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  updateCase: (caseKeys: CaseKeys, newWorkflowId: string) => Promise<void>;
  syncSuccess: (detail: SuccessEvent) => Promise<void>;
  getLatestWorkflow: (personalNumber: string) => Promise<WorkflowResult>;
}

function updateCaseWorkflowId(keys: CaseKeys, newWorkflowId: string) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.workflow = :newWorkflowId, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':newWorkflowId': newWorkflowId,
      ':updatedAt': Date.now(),
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

async function syncNewCaseWorkflowId(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user, status } = input.detail;

  const [getError, response] = await to(dependencies.getLatestWorkflow(user.personalNumber));
  if (!response?.attributes) {
    log.writeInfo('No workflow found for user', getError);
    return true;
  }
  const workflowId = response.attributes.workflowid;

  const queryCaseKeys: CaseKeys = {
    PK: `USER#${input.detail.user.personalNumber}`,
    SK: undefined,
  };
  const [getCaseError, userCase] = await to(dependencies.getCase(queryCaseKeys));
  if (!userCase) {
    log.writeError('No case found for user', getCaseError);
    return true;
  }

  await dependencies.syncSuccess({
    vivaApplicantStatusCodeList: status,
    caseKeys: {
      PK: userCase.PK,
      SK: userCase.SK,
    },
    user,
    workflowId,
  });

  return true;
}

export const main = log.wrap(event => {
  return syncNewCaseWorkflowId(event, {
    getCase: cases.get,
    updateCase: updateCaseWorkflowId,
    syncSuccess: putVivaMsEvent.syncWorkflowIdSuccess,
    getLatestWorkflow: vivaAdapter.workflow.getLatest,
  });
});
