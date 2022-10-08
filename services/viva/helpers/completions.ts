import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import {
  // status type
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_SUBMITTED,
  ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,

  // state
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
} from '../libs/constants';

import vivaAdapter from './vivaAdapterRequestClient';

import type { CaseItem, CaseCompletions, RequestedCaseCompletions } from '../types/caseItem';

interface CompletionForms {
  randomCheckFormId: string;
  completionFormId: string;
}

interface ConditionParams {
  completions: CaseCompletions;
  isNewApplication: boolean;
}

interface CompletionsResult {
  statusType: string;
  state: string;
}

interface CompletionsRule {
  condition: (params: ConditionParams) => boolean;
  result: CompletionsResult;
}

function getCompletionFormId(
  { randomCheckFormId, completionFormId }: CompletionForms,
  completions: CaseCompletions
): string {
  return isRandomCheck(completions) ? randomCheckFormId : completionFormId;
}

function createCompletionsResult(params: ConditionParams): CompletionsResult {
  const rules: CompletionsRule[] = [
    {
      condition: ({ completions }) => completions.isCompleted,
      result: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
      },
    },
    {
      condition: ({ completions }) => isRandomCheck(completions) && completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
    },
    {
      condition: ({ completions, isNewApplication }) =>
        isRandomCheck(completions) && isNewApplication && !completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
    },
    {
      condition: ({ completions, isNewApplication }) =>
        isRandomCheck(completions) && !isNewApplication && !completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
    },
    {
      condition: ({ completions }) =>
        !isRandomCheck(completions) && completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
    },
  ];

  const defaultResult: CompletionsResult = {
    statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
    state: VIVA_COMPLETION_REQUIRED,
  };

  const firstMatchingRule = rules.find(({ condition }) => condition(params));

  return firstMatchingRule?.result ?? defaultResult;
}

function isRandomCheck({ isRandomCheck, requested }: CaseCompletions): boolean {
  return isRandomCheck && !isAnyRequestedReceived(requested);
}

function isAnyRequestedReceived(requested: RequestedCaseCompletions[]): boolean {
  return requested.some(item => item.received);
}

async function getLatestVivaWorkflowId(personalNumber: string): Promise<string> {
  const workflow = await vivaAdapter.workflow.getLatest(personalNumber);
  return workflow.workflowid;
}

async function getCaseByWorkflowId(
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
  createCompletionsResult,
  get: {
    formId: getCompletionFormId,
    caseOnWorkflowId: getCaseByWorkflowId,
    workflow: {
      latest: {
        id: getLatestVivaWorkflowId,
      },
    },
  },
};
