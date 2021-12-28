import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import params from '../../../libs/params';
import log from '../../../libs/logs';
import { getStatusByType } from '../../../libs/caseStatuses';
import {
  VIVA_COMPLETION_REQUIRED,
  VIVA_COMPLETION_RANDOM_CHECK_REQUIRED,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_RANDOM_CHECK_REQUIRED_VIVA,
} from '../../../libs/constants';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
  const { personalNumber } = event.detail.user;

  const [getLatestWorkflowIdError, latestWorkflowId] = await to(
    getLatestVivaWorkflowId(personalNumber)
  );
  if (getLatestWorkflowIdError) {
    log.error(
      'Error getting Viva workflow completions',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-001',
      getLatestWorkflowIdError
    );
    return false;
  }

  const [getWorkflowCompletionsError, workflowCompletions] = await to(
    getVivaWorkflowCompletions(personalNumber, latestWorkflowId)
  );
  if (getWorkflowCompletionsError) {
    log.error(
      'Error getting Viva workflow completions',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-002',
      getWorkflowCompletionsError
    );
    return false;
  }

  const [getCaseError, userCase] = await to(getCase(personalNumber, latestWorkflowId));
  if (getCaseError) {
    log.error(
      'Get case from cases table failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-003',
      getCaseError
    );
    return false;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params [config.cases.providers.viva.envsKeyName] failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-004',
      paramsReadError
    );
    return false;
  }

  const caseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };
  const caseUpdateAttributes = {
    newStatus: getCompletionStatus(workflowCompletions),
    newState: getCompletionState(workflowCompletions),
    newCurrentFormId: getCompletionFormId(vivaCaseSSMParams, workflowCompletions),
    newPersons: resetCasePersonsApplicantSignature(userCase),
    workflowCompletions,
  };
  const [updateCaseCompletionsError, updatedCaseItem] = await to(
    updateCase(caseKeys, caseUpdateAttributes)
  );
  if (updateCaseCompletionsError) {
    log.error(
      'Update case completion attributes failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-005',
      updateCaseCompletionsError
    );
    return false;
  }

  log.info(
    'Successfully updated completion attributes on case',
    context.awsRequestId,
    'service-viva-ms-setCaseCompletions-006',
    updatedCaseItem
  );

  return true;
}

function getCompletionFormId(caseSSMParams, completions) {
  const { completionRandomCheckFormId, completionFormId } = caseSSMParams;
  return completions.isRandomCheck ? completionRandomCheckFormId : completionFormId;
}

function getCompletionStatus(completions) {
  return completions.isRandomCheck
    ? getStatusByType(ACTIVE_COMPLETION_RANDOM_CHECK_REQUIRED_VIVA)
    : getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
}

function getCompletionState(completions) {
  return completions.isRandomCheck
    ? VIVA_COMPLETION_RANDOM_CHECK_REQUIRED
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

async function getCase(personalNumber, workflowId) {
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

async function updateCase(keys, caseUpdateAttributes) {
  const { newStatus, newState, newCurrentFormId, newPersons, workflowCompletions } =
    caseUpdateAttributes;

  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #currentFormId = :newCurrentFormId, #status = :newStatus, #persons = :newPersons, #state = :newState, details.completions = :workflowCompletions',
    ExpressionAttributeNames: {
      '#currentFormId': 'currentFormId',
      '#status': 'status',
      '#persons': 'persons',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newCurrentFormId': newCurrentFormId,
      ':newPersons': newPersons,
      ':newStatus': newStatus,
      ':newState': newState,
      ':workflowCompletions': workflowCompletions,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

function resetCasePersonsApplicantSignature(caseItem) {
  const { persons } = caseItem;

  if (persons == undefined) {
    return [];
  }

  return persons.map(person => {
    if (person.role === 'applicant' && person.hasSigned) {
      person.hasSigned = false;
    }
    return person;
  });
}
