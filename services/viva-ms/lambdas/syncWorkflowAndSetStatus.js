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

  const [getAllUserCasesError, allUserCases] = await to(getAllUserCases(PK));
  if (getAllUserCasesError) {
    return console.error('(Viva-ms) DynamoDB query failed', getAllUserCasesError);
  }

  const workflowIds = getWorkflowIds(allUserCases);
  await syncCaseWorkflowsRew(workflowIds, personalNumber);

  await syncCaseWorkflows(allUserCases, personalNumber);

  return true;
}

async function getAllUserCases(PK) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': PK,
    },
  };

  return dynamoDb.call('query', params);
}

function getWorkflowIds(cases) {
  const workflowIds = [];
  const caseItems = cases.Items;

  for (const caseItem of caseItems) {
    const workflowId = caseItem.details.workflowId;
    if (!workflowId) {
      continue;
    }

    workflowIds.push(workflowId);
  }

  return workflowIds;
}

// eslint-disable-next-line no-unused-vars
async function syncCaseWorkflowsRew(workflows, personalNumber) {}

async function syncCaseWorkflows(cases, personalNumber) {
  const caseItems = cases.Items;

  for (const caseItem of caseItems) {
    const workflowId = caseItem.details.workflowId;

    if (!workflowId) {
      continue;
    }

    const [getWorkflowError, workflow] = await to(
      vivaAdapter.workflow.get({
        personalNumber,
        workflowId,
      })
    );
    if (getWorkflowError) {
      return console.error('(Viva-ms) syncWorkflow', getWorkflowError);
    }

    if (!deepEqual(workflow.attributes, caseItem.details.workflow)) {
      await syncWorkflowAndStatus(caseItem.PK, caseItem.SK, workflow.attributes);
    }
  }
}

function getWorkflowIds(cases) {
  const workflowIds = [];
  const caseItems = cases.Items;

  for (const caseItem of caseItems) {
    const workflowId = caseItem.details.workflowId;
    if (!workflowId) {
      continue;
    }

    workflowIds.push(workflowId);
  }

  return workflowIds;
}

async function syncWorkflowAndStatus(PK, SK, workflow) {
  const TableName = config.cases.tableName;
  let UpdateExpression = `SET ${CASE_WORKFLOW_PATH} = :newWorkflow`;
  const ExpressionAttributeValues = { ':newWorkflow': workflow };
  const ExpressionAttributeNames = {};

  const typeCode = workflow.decision?.decisions?.decision?.type?.typecode;

  if (typeCode === '01') {
    ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:approved:viva');
  } else if (typeCode === '02') {
    ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:rejected:viva');
  } else if (typeCode === '03') {
    ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:partiallyApproved:viva');
  } else if (workflow.calculations) {
    ExpressionAttributeValues[':newStatus'] = getStatusByType('active:processing');
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
