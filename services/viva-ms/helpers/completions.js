import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';
import {
  VIVA_COMPLETION_REQUIRED,
  VIVA_RANDOM_CHECK_REQUIRED,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
} from '../../../libs/constants';

import vivaAdapter from './vivaAdapterRequestClient';

function getCompletionFormId(completionForms, completions) {
  const { randomCheckFormId, completionFormId } = completionForms;
  return completions.isRandomCheck ? randomCheckFormId : completionFormId;
}

function getCompletionStatus(completions) {
  return completions.isRandomCheck
    ? getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA)
    : getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
}

function getCompletionState(completions) {
  return completions.isRandomCheck
    ? VIVA_RANDOM_CHECK_REQUIRED
    : VIVA_COMPLETION_REQUIRED;
}

async function getVivaWorkflowCompletions(personalNumber, workflowId) {
  const [getWorkflowCompletionsError, getCompletionsResponse] = await to(
    vivaAdapter.workflow.getCompletions({ personalNumber, workflowId })
  );
  if (getWorkflowCompletionsError) {
    throw getWorkflowCompletionsError;
  }

  return getCompletionsResponse.attributes;
}

async function getLatestVivaWorkflowId(personalNumber) {
  const [getLatestError, getLatestResponse] = await to(
    vivaAdapter.workflow.getLatest(personalNumber)
  );
  if (getLatestError) {
    throw getLatestError;
  }

  return getLatestResponse.attributes.workflowid;
}

async function getCaseOnWorkflowId(personalNumber, workflowId) {
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

  const [queryError, queryResponse] = await to(
    dynamoDb.call('query', queryParams)
  );
  if (queryError) {
    throw queryError;
  }

  const caseItem = queryResponse.Items[0];
  if (!caseItem) {
    throw `Case with workflow id: ${workflowId} not found`;
  }

  return caseItem;
}

export default {
  get: {
    formId: getCompletionFormId,
    status: getCompletionStatus,
    state: getCompletionState,
    caseOnWorkflowId: getCaseOnWorkflowId,
    workflow: {
      completions: getVivaWorkflowCompletions,
      latest: getLatestVivaWorkflowId,
    },
  },
};
