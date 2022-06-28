import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../helpers/constants';

import { CaseUser, CaseItem } from '../types/caseItem';
import { VivaApplicationStatus } from '../types/vivaMyPages';

interface UpdateCaseCompletionsResponse {
  Attributes: CaseItem;
}

interface LambdaContext {
  awsRequestId: string;
}

interface LambdaEvent {
  detail: {
    user: CaseUser;
    status: VivaApplicationStatus[];
  };
}
export async function main(event: LambdaEvent, context: LambdaContext) {
  const {
    user: { personalNumber },
    status: vivaApplicantStatusCodeList,
  } = event.detail;

  if (validateApplicationStatus(vivaApplicantStatusCodeList, [VIVA_STATUS_NEW_APPLICATION_OPEN])) {
    log.info(
      'Status belongs to a new application, stopping execution',
      context.awsRequestId,
      'service-viva-ms-syncCaseCompletions-005',
      undefined
    );
    return true;
  }

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

  const caseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };
  const [updateCaseError, updateCaseCompletionsResponse] = await to(
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

  const { Attributes: updatedCase } =
    updateCaseCompletionsResponse as UpdateCaseCompletionsResponse;

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
