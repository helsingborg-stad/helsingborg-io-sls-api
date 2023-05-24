import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import {
  // status type
  ACTIVE_SUBMITTED,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,

  // state
  VIVA_APPLICATION_RECEIVED,
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  COMPLETIONS_DUE_DATE_PASSED,
} from '../libs/constants';

import vivaAdapter from './vivaAdapterRequestClient';

import type { CaseItem, CaseCompletions, RequestedCaseCompletions } from '../types/caseItem';

interface FormIds {
  recurringFormId: string;
  randomCheckFormId: string;
  completionFormId: string;
}

interface ConditionParams {
  completions: CaseCompletions;
  forms: FormIds;
}

interface CompletionDecisionResult {
  statusType: string | undefined;
  state: string | undefined;
  formId: string | undefined;
}

interface CompletionsDecisionRule {
  condition: (params: ConditionParams) => boolean;
  result: CompletionDecisionResult;
}

function createCompletionsResult(params: ConditionParams): CompletionDecisionResult {
  const rules: CompletionsDecisionRule[] = [
    {
      condition: ({ completions }) => completions.isCompleted,
      result: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
        formId: params.forms.recurringFormId,
      },
    },
    {
      condition: ({ completions }) => completions.isDueDateExpired,
      result: {
        statusType: ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
        state: COMPLETIONS_DUE_DATE_PASSED,
        formId: params.forms.recurringFormId,
      },
    },
    {
      condition: ({ completions }) =>
        isRandomCheck(completions) && completions.isAttachmentPending === false,
      result: {
        statusType: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
        formId: params.forms.randomCheckFormId,
      },
    },
    {
      condition: ({ completions }) =>
        !isRandomCheck(completions) && completions.isAttachmentPending === false,
      result: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: params.forms.completionFormId,
      },
    },
    {
      condition: ({ completions }) => isRandomCheck(completions) && completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
        formId: params.forms.randomCheckFormId,
      },
    },
    {
      condition: ({ completions }) =>
        !isRandomCheck(completions) && completions.isAttachmentPending,
      result: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: params.forms.completionFormId,
      },
    },
  ];

  const defaultResult: CompletionDecisionResult = {
    statusType: undefined,
    state: undefined,
    formId: undefined,
  };

  const firstMatchingRule = rules.find(({ condition }) => condition(params));

  return firstMatchingRule?.result ?? defaultResult;
}

function isRandomCheck({ isRandomCheck, requested }: CaseCompletions): boolean {
  return isRandomCheck && !isAnyRequestedReceived(requested);
}

function isAnyRequestedReceived(requested: RequestedCaseCompletions[]): boolean {
  return requested.some(({ received }) => received);
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
    caseOnWorkflowId: getCaseByWorkflowId,
    workflow: {
      latest: {
        id: getLatestVivaWorkflowId,
      },
    },
  },
};
