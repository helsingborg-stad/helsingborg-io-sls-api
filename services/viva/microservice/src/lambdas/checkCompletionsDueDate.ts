import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import { getStatusByType } from '../libs/caseStatuses';
import {
  COMPLETIONS_DUE_DATE_PASSED,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
} from '../libs/constants';
import { cases } from '../helpers/query';
import {
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

import type { CaseItem, CaseStatus } from '../types/caseItem';
import type { VivaApplicationStatus } from '../types/vivaMyPages';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  vivaApplicantStatusCodeList: VivaApplicationStatus[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  updateCase: (keys: CaseKeys, attributes: UpdateCaseAttributes) => Promise<void>;
}

interface UpdateCaseAttributes {
  newStatus: CaseStatus;
  newState: string;
}

function updateCase(keys: CaseKeys, attributes: UpdateCaseAttributes): Promise<void> {
  const { newStatus, newState } = attributes;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #status = :newStatus, #state = :newState, details.completions.requested = :completionsRequested, details.completions.dueDate = :completionsDueDate',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newStatus': newStatus,
      ':newState': newState,
      ':completionsRequested': [],
      ':completionsDueDate': null,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function checkCompletionsDueDate(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys, vivaApplicantStatusCodeList } = input.detail;

  const requiredStatusCodes = [
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (!validateApplicationStatus(vivaApplicantStatusCodeList, requiredStatusCodes)) {
    return true;
  }

  const userCase = await dependencies.getCase(caseKeys);
  if (!userCase.details.completions?.isDueDateExpired) {
    return true;
  }

  await dependencies.updateCase(caseKeys, {
    newStatus: getStatusByType(ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA),
    newState: COMPLETIONS_DUE_DATE_PASSED,
  });

  return true;
}

export const main = log.wrap(async event => {
  return checkCompletionsDueDate(event, {
    getCase: cases.get,
    updateCase,
  });
});
