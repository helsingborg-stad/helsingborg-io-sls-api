/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const CASE_WORKFLOW_PATH = 'details.workflow';

export async function main(event) {
  const personalNumber = event.detail.user.personalNumber;
  const PK = `USER#${personalNumber}`;

  const [getUserSubmittedCasesError, userSubmittedCases] = await to(getUserSubmittedCases(PK));
  if (getUserSubmittedCasesError) {
    return console.error('(Viva-ms) DynamoDB query failed', getUserSubmittedCasesError);
  }

  const userSubmittedCasesItems = userSubmittedCases.Items;
  if (userSubmittedCasesItems === undefined || userSubmittedCasesItems.length === 0) {
    return console.error('(Viva-ms) DynamoDB query did not fetch any cases');
  }

  for (const userCase of userSubmittedCasesItems) {
    const workflowId = userCase.details.workflowId;
    console.log('workflowId', workflowId);

    const [adapterGetWorkflowError, vivaWorkflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (adapterGetWorkflowError) {
      console.error('(Viva-ms) Adapter get workflow', adapterGetWorkflowError);
      continue;
    }

    if (!deepEqual(vivaWorkflow.attributes, userCase.details?.workflow)) {
      await syncWorkflowAndStatus(userCase.PK, userCase.SK, vivaWorkflow.attributes);
    }
  }

  return true;
}

async function getUserSubmittedCases(PK) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeSubmitted)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted:viva',
    },
  };

  return dynamoDb.call('query', params);
}

async function syncWorkflowAndStatus(PK, SK, workflow) {
  const TableName = config.cases.tableName;
  let UpdateExpression = `SET ${CASE_WORKFLOW_PATH} = :newWorkflow`;
  const ExpressionAttributeValues = { ':newWorkflow': workflow };
  const ExpressionAttributeNames = {};
  let decisionStatus = 0;

  const decisionList = workflow.decision?.decisions?.decision;
  if (decisionList !== undefined) {
    decisionList.forEach(decision => {
      const decisionType = decision.typecode;
      decisionStatus = decisionStatus | parseInt(decisionType, 10);
    });

    if (decisionStatus === 1) {
      ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:approved:viva');
    } else if (decisionStatus === 2) {
      ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:rejected:viva');
    } else if (decisionStatus === 3) {
      ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:partiallyApproved:viva');
    }
  }

  if (ExpressionAttributeValues[':newStatus']) {
    UpdateExpression += ', #status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
  }

  const params = {
    TableName,
    Key: { PK, SK },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  if (ExpressionAttributeNames && Object.keys(ExpressionAttributeNames).length > 0) {
    params.ExpressionAttributeNames = ExpressionAttributeNames;
  }

  const [updateError] = await to(dynamoDb.call('update', params));
  if (updateError) {
    return console.error('(Viva-ms) syncWorkflow', updateError);
  }

  return true;
}
