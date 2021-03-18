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

  const userCaseItems = allUserCases.Items;
  if (userCaseItems === undefined || userCaseItems.length === 0) {
    return console.error('(Viva-ms) DynamoDB query did not fetch any cases');
  }

  for (const userCase of userCaseItems) {
    const workflowId = userCase.details.workflowId;

    const [myPagesError, myPagesResponse] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (myPagesError) {
      return console.error('(Viva-ms) My pages request error', myPagesError);
    }

    if (!deepEqual(myPagesResponse.attributes, userCase.details?.workflow)) {
      await syncWorkflowAndStatus(userCase.PK, userCase.SK, myPagesResponse.attributes);
    }
  }

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

async function syncWorkflowAndStatus(PK, SK, workflow) {
  const TableName = config.cases.tableName;
  let UpdateExpression = `SET ${CASE_WORKFLOW_PATH} = :newWorkflow`;
  const ExpressionAttributeValues = { ':newWorkflow': workflow };
  const ExpressionAttributeNames = {};
  let decisionStatus = 0;

  const decisionList = workflow.decision?.decisions?.decision;
  if (decisionList === undefined) {
    if (workflow?.application?.requestingcompletion === '1') {
      ExpressionAttributeValues[':newStatus'] = getStatusByType('active:completionRequired:viva');
    }
  } else {
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
