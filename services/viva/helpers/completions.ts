import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import { getStatusByType } from '../libs/caseStatuses';
import {
  // status type
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_SUBMITTED,

  // state
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
} from '../libs/constants';

import vivaAdapter from './vivaAdapterRequestClient';

import type {
  CaseItem,
  CaseCompletions,
  CaseStatus,
  RequestedCaseCompletions,
} from '../types/caseItem';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CompletionForms {
  randomCheckFormId: string;
  completionFormId: string;
}

function getCompletionFormId(
  { randomCheckFormId, completionFormId }: CompletionForms,
  completions: CaseCompletions
): string {
  return isRandomCheck(completions) ? randomCheckFormId : completionFormId;
}

function getCompletionStatus(completions: CaseCompletions): CaseStatus {
  if (completions.isCompleted) {
    return getStatusByType(ACTIVE_SUBMITTED);
  }

  if (isRandomCheck(completions)) {
    if (completions.isAttachmentPending) {
      return getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA);
    }
    return getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA);
  }

  if (completions.isAttachmentPending) {
    return getStatusByType(ACTIVE_COMPLETION_SUBMITTED_VIVA);
  }

  return getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
}

function getCompletionState(completions: CaseCompletions) {
  if (completions.isCompleted) {
    return VIVA_APPLICATION_RECEIVED;
  }

  if (isRandomCheck(completions)) {
    return VIVA_RANDOM_CHECK_REQUIRED;
  }

  return VIVA_COMPLETION_REQUIRED;
}

function isRandomCheck({ isRandomCheck, requested }: CaseCompletions): boolean {
  return isRandomCheck && !isAnyRequestedReceived(requested);
}

function isAnyRequestedReceived(requested: RequestedCaseCompletions[]): boolean {
  return requested.some(item => item.received);
}

async function getVivaWorkflowCompletions(
  personalNumber: string,
  workflowId: string
): Promise<VadaWorkflowCompletions> {
  const getCompletionsResponse = await vivaAdapter.workflow.getCompletions({
    personalNumber,
    workflowId,
  });
  return getCompletionsResponse.attributes;
}

async function getLatestVivaWorkflowId(personalNumber: string): Promise<string> {
  const getLatestResponse = await vivaAdapter.workflow.getLatest(personalNumber);
  return getLatestResponse.attributes.workflowid;
}

async function getCaseOnWorkflowId(
  personalNumber: string,
  workflowId: string
): Promise<CaseItem | undefined> {
  const PK = `USER#${personalNumber}`;

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':workflowId': workflowId,
    },
  };

  const queryResponse = await dynamoDb.call('query', queryParams);
  return queryResponse.Items[0];
}

export default {
  get: {
    formId: getCompletionFormId,
    status: getCompletionStatus,
    state: getCompletionState,
    caseOnWorkflowId: getCaseOnWorkflowId,
    workflow: {
      completions: getVivaWorkflowCompletions,
      latest: {
        id: getLatestVivaWorkflowId,
      },
    },
  },
};
