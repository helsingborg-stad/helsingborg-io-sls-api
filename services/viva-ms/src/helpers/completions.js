import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import { getStatusByType } from '../libs/caseStatuses';
import {
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
} from '../libs/constants';

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

async function getVivaWorkflowCompletions(personalNumber, workflowId) {
  const getCompletionsResponse = await vivaAdapter.workflow.getCompletions({
    personalNumber,
    workflowId,
  });
  return getCompletionsResponse.attributes;
}

async function getLatestVivaWorkflowId(personalNumber) {
  const getLatestWorkflowResponse = await vivaAdapter.workflow.getLatest(personalNumber);
  return getLatestWorkflowResponse.attributes.workflowid;
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

function getLocaleDate(value) {
  const LOCALE_OPTION = {
    timeZone: 'Europe/Stockholm',
  };

  return new Date(new Date(value).toLocaleDateString('sv-SE', LOCALE_OPTION)).setHours(0, 0, 0, 0);
}

function notDueDateExpired(date) {
  const today = getLocaleDate(Date.now());
  const dueDate = getLocaleDate(date);

  if (today < dueDate) {
    return true;
  }

  return false;
}

export default {
  get: {
    formId: getCompletionFormId,
    status: getCompletionStatus,
    caseOnWorkflowId: getCaseOnWorkflowId,
    workflow: {
      completions: getVivaWorkflowCompletions,
      latest: {
        id: getLatestVivaWorkflowId,
      },
    },
  },
  notDueDateExpired,
};
