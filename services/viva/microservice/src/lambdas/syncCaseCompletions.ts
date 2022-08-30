import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../helpers/constants';

import type { CaseUser, CaseItem, PersonalNumber } from '../types/caseItem';
import type { VivaApplicationStatus } from '../types/vivaMyPages';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  user: CaseUser;
  status: VivaApplicationStatus[];
}

interface LambdaRequest {
  detail: LambdaDetails;
}

interface PutSuccessEvent {
  applicantStatusCodeList: VivaApplicationStatus[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface Dependencies {
  putSuccessEvent: (params: PutSuccessEvent) => Promise<void>;
  updateCase: (keys: CaseKeys, newCompletions: VadaWorkflowCompletions) => Promise<void>;
  validateStatusCode: (statusList: VivaApplicationStatus[], requiredCodeList: number[]) => boolean;
  getLatestWorkflowId: (user: PersonalNumber) => Promise<string>;
  getWorkflowCompletions: (
    user: PersonalNumber,
    workflowId: string
  ) => Promise<VadaWorkflowCompletions>;
  getCaseOnWorkflowId: (user: PersonalNumber, workflowId: string) => Promise<CaseItem>;
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
    status: applicantStatusCodeList,
  } = input.detail;

  if (
    dependencies.validateStatusCode(applicantStatusCodeList, [VIVA_STATUS_NEW_APPLICATION_OPEN])
  ) {
    return true;
  }

  const latestWorkflowId = await dependencies.getLatestWorkflowId(personalNumber);
  if (!latestWorkflowId) {
    log.writeError('Get latest Viva workflow failed');
    return false;
  }

  const workflowCompletions = await dependencies.getWorkflowCompletions(
    personalNumber,
    latestWorkflowId
  );
  if (!workflowCompletions) {
    log.writeError('Get Viva workflow completions failed');
    return false;
  }

  const userCase = await dependencies.getCaseOnWorkflowId(personalNumber, latestWorkflowId);
  if (!userCase) {
    log.writeError('Get case from cases table failed');
    return false;
  }

  const caseKeys: CaseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };

  await dependencies.updateCase(caseKeys, workflowCompletions);

  await dependencies.putSuccessEvent({
    applicantStatusCodeList,
    workflowCompletions,
    caseKeys,
    caseState: userCase.state,
    caseStatusType: userCase.status.type,
  });

  return true;
}

export const main = log.wrap(async event => {
  return syncCaseCompletions(event, {
    putSuccessEvent: putVivaMsEvent.syncCaseCompletionsSuccess,
    updateCase: updateCaseCompletions,
    validateStatusCode: validateApplicationStatus,
    getLatestWorkflowId: completionsHelper.get.workflow.latest.id,
    getWorkflowCompletions: completionsHelper.get.workflow.completions,
    getCaseOnWorkflowId: completionsHelper.get.caseOnWorkflowId,
  });
});
