import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
  const { personalNumber } = event.detail.user;

  const [getCasesError, userCases] = await to(
    getSubmittedOrProcessingOrOngoingCases(personalNumber)
  );
  if (getCasesError) {
    log.error(
      'Get closed or submitted or ongoing cases failed',
      context.awsRequestId,
      'service-viva-ms-syncWorkflow-001',
      getCasesError
    );
    return false;
  }

  const caseList = userCases.Items;
  const isEmptyCaseList = Array.isArray(caseList) && !caseList.length;
  if (isEmptyCaseList) {
    return true;
  }

  const caseListHasWorkflowId = caseList.filter(caseItem => !!caseItem.details.workflowId);

  for (const caseItem of caseListHasWorkflowId) {
    const caseKeys = {
      PK: caseItem.PK,
      SK: caseItem.SK,
    };

    const { workflowId } = caseItem.details;

    const [adapterWorkflowGetError, workflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (adapterWorkflowGetError) {
      log.error(
        'Get workflow from Vada request failed',
        context.awsRequestId,
        'service-viva-ms-syncWorkflow-002',
        adapterWorkflowGetError
      );
      continue;
    }

    await updateCaseDetailsWorkflow(caseKeys, workflow.attributes);
    await putVivaMsEvent.syncWorkflowSuccess({ caseKeys, workflow });
  }

  return true;
}

function getSubmittedOrProcessingOrOngoingCases(personalNumber) {
  const PK = `USER#${personalNumber}`;

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      '(begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing) or begins_with(#status.#type, :statusTypeOngoing)) and provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted',
      ':statusTypeProcessing': 'active:processing',
      ':statusTypeOngoing': 'active:ongoing',
      ':provider': 'VIVA',
    },
  };

  return dynamoDb.call('query', queryParams);
}

function updateCaseDetailsWorkflow(caseKeys, newWorkflow) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: {
      ':newWorkflow': newWorkflow,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}
