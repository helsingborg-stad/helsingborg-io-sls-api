import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';

export async function main(event, context) {
  const {
    user: { personalNumber },
    vivaApplicantStatusCodeList,
  } = event.detail;

  const latestWorkflowId = await getLatestWorkflowId({ personalNumber, context });
  const workflowCompletions = await getWorkflowCompletions({
    personalNumber,
    latestWorkflowId,
    context,
  });

  const userCase = await getUserCase({
    personalNumber,
    latestWorkflowId,
    context,
  });

  const caseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };
  const [updateCaseError, { Attributes: updatedCase }] = await to(
    updateCaseCompletions(caseKeys, workflowCompletions)
  );
  if (updateCaseError) {
    log.error(
      'Update case completion attributes failed',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-030',
      updateCaseError
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.syncCaseCompletionsSuccess({
      vivaApplicantStatusCodeList,
      workflowCompletions,
      caseKeys,
      caseState: userCase.state,
      caseStatusType: userCase.status.type,
    })
  );
  if (putEventError) {
    log.error(
      'Error put event [syncCaseCompletionsSuccess]',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-035',
      putEventError
    );
    return false;
  }

  log.info(
    'Successfully updated completions attributes on case',
    context.awsRequestId,
    'service-viva-ms-syncCaseCompletions-040',
    updatedCase.id
  );

  return true;
}

async function getLatestWorkflowId(params) {
  const { personalNumber, context } = params;
  const [getLatestWorkflowIdError, latestWorkflowId] = await to(
    completionsHelper.get.workflow.latest.id(personalNumber)
  );
  if (getLatestWorkflowIdError) {
    log.error(
      'Error getting the latest Viva workflow',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-010',
      getLatestWorkflowIdError
    );
    return false;
  }
  return latestWorkflowId;
}

async function getWorkflowCompletions(params) {
  const { personalNumber, latestWorkflowId, context } = params;
  const [getWorkflowCompletionsError, workflowCompletions] = await to(
    completionsHelper.get.workflow.completions(personalNumber, latestWorkflowId)
  );
  if (getWorkflowCompletionsError) {
    log.error(
      'Error getting Viva workflow completions',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-015',
      getWorkflowCompletionsError
    );
    return false;
  }

  return workflowCompletions;
}

async function getUserCase(params) {
  const { personalNumber, latestWorkflowId, context } = params;
  const [getCaseError, userCase] = await to(
    completionsHelper.get.caseOnWorkflowId(personalNumber, latestWorkflowId)
  );
  if (getCaseError) {
    log.error(
      'Get case from cases table failed',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-020',
      getCaseError
    );
    return false;
  }

  return userCase;
}

function updateCaseCompletions(keys, newWorkflowCompletions) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.completions = :workflowCompletions',
    ExpressionAttributeValues: {
      ':workflowCompletions': newWorkflowCompletions,
    },
    ProjectionExpression: 'id',
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}
