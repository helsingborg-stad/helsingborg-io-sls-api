import to from 'await-to-js';

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

export function getCompletionFormId(completionForms, completions) {
  const { randomCheckFormId, completionFormId } = completionForms;
  return isRandomCheck(completions) ? randomCheckFormId : completionFormId;
}

export function getCompletionStatus(completions) {
  const { isCompleted, isAttachmentPending } = completions;

  if (isCompleted) {
    return getStatusByType(ACTIVE_SUBMITTED);
  }

  if (isRandomCheck(completions)) {
    if (isAttachmentPending) {
      return getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA);
    }
    return getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA);
  }

  if (isAttachmentPending) {
    return getStatusByType(ACTIVE_COMPLETION_SUBMITTED_VIVA);
  }

  return getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
}

export function getCompletionState(completions) {
  if (completions.isCompleted) {
    return VIVA_APPLICATION_RECEIVED;
  }

  if (isRandomCheck(completions)) {
    return VIVA_RANDOM_CHECK_REQUIRED;
  }

  return VIVA_COMPLETION_REQUIRED;
}
export function isRandomCheck(completions) {
  const { isRandomCheck, requested } = completions;
  return isRandomCheck && !isAnyRequestedReceived(requested);
}

export function isAnyRequestedReceived(requestedList) {
  return requestedList.some(item => item.received);
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

  const [queryError, queryResponse] = await to(dynamoDb.call('query', queryParams));
  if (queryError) {
    throw queryError;
  }

  const caseItem = queryResponse.Items[0];
  if (!caseItem) {
    throw `Case with workflow id: ${workflowId} not found`;
  }

  return caseItem;
}

function getLocaleDate(timestamp) {
  return new Date(
    new Date(timestamp).toLocaleDateString('sv-SE', {
      timeZone: 'Europe/Stockholm',
    })
  ).setHours(0, 0, 0, 0);
}

function isDueDateExpired(timestamp) {
  if (timestamp == undefined) {
    return false;
  }

  const today = getLocaleDate(Date.now());
  const dueDate = getLocaleDate(timestamp);
  return today >= dueDate;
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
  isDueDateExpired,
};