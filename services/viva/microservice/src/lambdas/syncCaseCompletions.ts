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

interface SuccessEvent {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

interface CaseNotFoundEvent {
  user: CaseUser;
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  vivaLatestWorkflowId: string;
}

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

export interface Dependencies {
  triggerSuccessEvent: (params: SuccessEvent) => Promise<void>;
  triggerCaseNotFoundEvent: (params: CaseNotFoundEvent) => Promise<void>;
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
    UpdateExpression: 'SET details.completions = :workflowCompletions, updatedAt = :newUpdatedAt',
    ExpressionAttributeValues: {
      ':workflowCompletions': newCompletions,
      ':newUpdatedAt': Date.now(),
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
  const userCase = await dependencies.getCaseOnWorkflowId(personalNumber, latestWorkflowId);
  if (!userCase) {
    await dependencies.triggerCaseNotFoundEvent({
      user: input.detail.user,
      vivaApplicantStatusCodeList,
      vivaLatestWorkflowId: latestWorkflowId,
    });
    return true;
  }

  const caseKeys: CaseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };
  const workflowCompletions = await dependencies.getWorkflowCompletions({
    personalNumber,
    workflowId: latestWorkflowId,
  });
  await dependencies.updateCase(caseKeys, workflowCompletions);

  await dependencies.triggerSuccessEvent({
    vivaApplicantStatusCodeList,
    workflowCompletions,
    caseKeys,
    caseState: userCase.state,
    caseStatusType: userCase.status.type,
  });

  return true;
}

export const main = log.wrap(event =>
  syncCaseCompletions(event, {
    triggerSuccessEvent: putVivaMsEvent.syncCaseCompletionsSuccess,
    triggerCaseNotFoundEvent: putVivaMsEvent.syncCaseCompletionsCaseNotFound,
    updateCase: updateCaseCompletions,
    validateStatusCode: validateApplicationStatus,
    getLatestWorkflowId: completionsHelper.get.workflow.latest.id,
    getWorkflowCompletions: vivaAdapter.workflow.getCompletions,
    getCaseOnWorkflowId: completionsHelper.get.caseOnWorkflowId,
  })
);
