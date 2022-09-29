import to from 'await-to-js';
import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';

import { cases } from '../helpers/query';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

import type { CaseItem } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

interface CaseKeys {
  PK: string;
  SK?: string;
}

interface User {
  personalNumber: string;
}

interface LambdaDetails {
  user: User;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

interface SuccessEvent {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  caseKeys: CaseKeys;
  user: User;
  workflowId: string;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  updateCase: (caseKeys: CaseKeys, newWorkflowId: string) => Promise<void>;
  syncSuccess: (detail: SuccessEvent) => Promise<void>;
  getLatestWorkflow: (personalNumber: number) => Promise<VivaWorkflow>;
}

function updateCaseWorkflowId(keys: CaseKeys, newWorkflowId: string): Promise<void> {
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

  const [getError, workflow] = await to(dependencies.getLatestWorkflow(+user.personalNumber));
  if (!workflow) {
    log.writeInfo('No workflow found for user', getError);
    return true;
  }
  const workflowId = workflow.workflowid;

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
