import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import { getStatusByType } from '../libs/caseStatuses';
import {
  COMPLETIONS_DUE_DATE_PASSED,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
} from '../libs/constants';

import type { CaseStatus } from '../types/caseItem';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
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
  updateCase: (keys: CaseKeys, params: UpdateCaseParams) => Promise<void>;
}

interface UpdateCaseParams {
  newStatus: CaseStatus;
  newState: string;
}

function updateCase(keys: CaseKeys, params: UpdateCaseParams): Promise<void> {
  const { newStatus, newState } = params;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET #status = :newStatus, #state = :newState',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newStatus': newStatus,
      ':newState': newState,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function checkCompletionsDueDate(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys, workflowCompletions } = input.detail;
  const caseId = caseKeys.SK.split('#')[1];

  if (!workflowCompletions.isDueDateExpired) {
    log.writeInfo(`Due date not expired. Will NOT update case with id: ${caseId}`);
    return true;
  }

  const updateCaseParams: UpdateCaseParams = {
    newStatus: getStatusByType(ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA),
    newState: COMPLETIONS_DUE_DATE_PASSED,
  };
  await dependencies.updateCase(caseKeys, updateCaseParams);

  return true;
}

export const main = log.wrap(event =>
  checkCompletionsDueDate(event, {
    updateCase,
  })
);
