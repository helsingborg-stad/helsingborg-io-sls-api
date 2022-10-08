import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../helpers/constants';

import type { GetWorkflowPayload } from '../helpers/vivaAdapterRequestClient';
import type { CaseUser, CaseItem, PersonalNumber } from '../types/caseItem';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  user: CaseUser;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

interface PutSuccessEvent {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface Dependencies {
  putSuccessEvent: (params: PutSuccessEvent) => Promise<void>;
  updateCase: (keys: CaseKeys, newCompletions: VadaWorkflowCompletions) => Promise<void>;
  validateStatusCode: (
    statusList: VivaApplicationsStatusItem[],
    requiredCodeList: number[]
  ) => boolean;
  getLatestWorkflowId: (user: PersonalNumber) => Promise<string>;
  getWorkflowCompletions: (payload: GetWorkflowPayload) => Promise<VadaWorkflowCompletions>;
  getCaseOnWorkflowId: (user: PersonalNumber, workflowId: string) => Promise<CaseItem | undefined>;
}

function updateCaseCompletions(
  keys: CaseKeys,
  newCompletions: VadaWorkflowCompletions
): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.completions = :workflowCompletions',
    ExpressionAttributeValues: {
      ':workflowCompletions': newCompletions,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function syncCaseCompletions(input: LambdaRequest, dependencies: Dependencies) {
  const {
    user: { personalNumber },
    status: vivaApplicantStatusCodeList,
  } = input.detail;

  const isNewApplicationOpen = dependencies.validateStatusCode(vivaApplicantStatusCodeList, [
    VIVA_STATUS_NEW_APPLICATION_OPEN,
  ]);
  if (isNewApplicationOpen) {
    return true;
  }

  const latestWorkflowId = await dependencies.getLatestWorkflowId(personalNumber);
  const workflowCompletions = await dependencies.getWorkflowCompletions({
    personalNumber,
    workflowId: latestWorkflowId,
  });

  const userCase = await dependencies.getCaseOnWorkflowId(personalNumber, latestWorkflowId);
  if (!userCase) {
    return true;
  }

  const caseKeys: CaseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };
  await dependencies.updateCase(caseKeys, workflowCompletions);

  await dependencies.putSuccessEvent({
    vivaApplicantStatusCodeList,
    workflowCompletions,
    caseKeys,
    caseState: userCase.state,
    caseStatusType: userCase.status.type,
  });

  return true;
}

export const main = log.wrap(event => {
  return syncCaseCompletions(event, {
    putSuccessEvent: putVivaMsEvent.syncCaseCompletionsSuccess,
    updateCase: updateCaseCompletions,
    validateStatusCode: validateApplicationStatus,
    getLatestWorkflowId: completionsHelper.get.workflow.latest.id,
    getWorkflowCompletions: vivaAdapter.workflow.getCompletions,
    getCaseOnWorkflowId: completionsHelper.get.caseOnWorkflowId,
  });
});
