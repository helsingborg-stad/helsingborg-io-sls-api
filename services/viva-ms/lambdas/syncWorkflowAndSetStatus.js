/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event) {
  const personalNumber = event.detail.user.personalNumber;

  const [getUserCasesError, userCases] = await to(
    getSubmittedAndOrProcessingUserCases(personalNumber)
  );
  if (getUserCasesError) {
    throw ('(Viva-ms) DynamoDB query failed', getUserCasesError);
  }

  const userCasesItems = userCases.Items;
  if (userCasesItems === undefined || userCasesItems.length === 0) {
    return console.info(
      '(Viva-ms) DynamoDB query did not fetch any active:submitted or active:processing case(s)'
    );
  }

  for (const userCase of userCasesItems) {
    const userCasePrimaryKey = {
      PK: userCase.PK,
      SK: userCase.SK,
    };

    const workflowId = userCase.details.workflowId;
    const [adapterGetWorkflowError, vivaWorkflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );

    if (adapterGetWorkflowError) {
      console.error('(Viva-ms) Adapter get workflow', adapterGetWorkflowError);
      continue;
    }

    const [syncCaseWorkflowDetailsError] = await to(
      syncCaseWorkflowDetails(userCasePrimaryKey, vivaWorkflow.attributes)
    );
    if (syncCaseWorkflowDetailsError) {
      console.error('(Viva-ms) syncCaseWorkflowDetailsError');
      throw syncCaseWorkflowDetailsError;
    }

    if (!deepEqual(vivaWorkflow.attributes, userCase.details?.workflow)) {
      await setStatus(userCasePrimaryKey, vivaWorkflow.attributes);
    }
  }

  return true;
}

async function getSubmittedAndOrProcessingUserCases(personalNumber) {
  const TableName = config.cases.tableName;
  const PK = `USER#${personalNumber}`;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      'begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted:viva',
      ':statusTypeProcessing': 'active:processing',
    },
  };

  return dynamoDb.call('query', params);
}

async function syncCaseWorkflowDetails(casePrimaryKey, workflow) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: { ':newWorkflow': workflow },
    ReturnValues: 'NONE',
  };

  const [updateWorkflowDetailsError] = await to(dynamoDb.call('update', params));
  if (updateWorkflowDetailsError) {
    throw updateWorkflowDetailsError;
  }

  return true;
}

async function setStatus(casePrimaryKey, workflow) {
  const TableName = config.cases.tableName;

  const vivaWorkflowDecisionList = makeArray(workflow.decision?.decisions?.decision);
  const vivaWorkflowCalculation = workflow.calculations?.calculation;

  let decisionStatus = 0;
  let newStatusType = '';

  if (vivaWorkflowDecisionList !== undefined && vivaWorkflowDecisionList.length > 0) {
    vivaWorkflowDecisionList.forEach(decision => {
      const decisionTypeCode = decision.typecode;
      decisionStatus = decisionStatus | parseInt(decisionTypeCode, 10);
    });

    if (decisionStatus === 1) {
      newStatusType = 'closed:approved:viva';
    } else if (decisionStatus === 2) {
      newStatusType = 'closed:rejected:viva';
    } else if (decisionStatus === 3) {
      newStatusType = 'closed:partiallyApproved:viva';
    }
  } else if (vivaWorkflowCalculation !== undefined) {
    newStatusType = 'active:processing';
  } else {
    return false;
  }

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET #status = :newStatusType',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':newStatusType': getStatusByType(newStatusType) },
    ReturnValues: 'NONE',
  };

  const [updateError] = await to(dynamoDb.call('update', params));
  if (updateError) {
    return console.error('(Viva-ms) syncWorkflow', updateError);
  }

  return true;
}

function makeArray(value) {
  let list = [];

  if (Array.isArray(value)) {
    list = [...value];
  } else if (value !== undefined) {
    list.push(value);
  }

  return list;
}
