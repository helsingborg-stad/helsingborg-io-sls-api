/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event) {
  const personalNumber = event.detail.user.personalNumber;

  const [getCasesError, userCases] = await to(
    getCasesWithStatusSumbittedOrProcessing(personalNumber)
  );
  if (getCasesError) {
    throw getCasesError;
  }

  const casesItems = userCases.Items;
  if (casesItems === undefined || casesItems.length === 0) {
    return console.info(
      '(Viva-ms) DynamoDB query did not fetch any active:submitted or active:processing case(s)'
    );
  }

  for (const userCase of casesItems) {
    const casePrimaryKey = {
      PK: userCase.PK,
      SK: userCase.SK,
    };

    const workflowId = userCase.details.workflowId;
    const [adapterWorkflowGetError, workflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (adapterWorkflowGetError) {
      console.error('(Viva-ms) Adapter get workflow', adapterWorkflowGetError);
      continue;
    }

    const [updateDbWorkflowError] = await to(updateDbWorkflow(casePrimaryKey, workflow.attributes));
    if (updateDbWorkflowError) {
      throw updateDbWorkflowError;
    }

    if (!deepEqual(workflow.attributes, userCase.details?.workflow)) {
      const newStatusType = decideNewStatusType(workflow.attributes);
      if (newStatusType == undefined) {
        console.info('(Viva-ms) no new status to update');
        continue;
      }

      const [updateDbNewStatusError] = await to(
        updateDbNewStatus(casePrimaryKey, getStatusByType(newStatusType))
      );
      if (updateDbNewStatusError) {
        console.error('(Viva-ms) updateDbNewStatusError', updateDbNewStatusError);
      }
    }
  }

  return true;
}

async function getCasesWithStatusSumbittedOrProcessing(personalNumber) {
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

async function updateDbWorkflow(casePrimaryKey, workflow) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: { ':newWorkflow': workflow },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}

async function updateDbNewStatus(casePrimaryKey, newStatus) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET #status = :newStatusType',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':newStatusType': newStatus },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}

function decideNewStatusType(workflowAttributes) {
  const decisionList = makeArray(workflowAttributes.decision?.decisions?.decision);
  const paymentList = makeArray(workflowAttributes.payments?.payment);
  const calculation = workflowAttributes.calculations?.calculation;

  let decisionStatus = 0;
  let newStatusType = '';

  if (decisionList != undefined && decisionList.length > 0) {
    decisionList.forEach(decision => {
      decisionStatus = decisionStatus | parseInt(decision.typecode, 10);
    });

    if (decisionStatus === 1 && paymentList != undefined && paymentList.length > 0) {
      newStatusType = 'closed:approved:viva';
    } else if (decisionStatus === 2) {
      newStatusType = 'closed:rejected:viva';
    } else if (decisionStatus === 3 && paymentList != undefined && paymentList.length > 0) {
      newStatusType = 'closed:partiallyApproved:viva';
    } else {
      newStatusType = 'active:processing';
    }
  } else if (calculation != undefined) {
    newStatusType = 'active:processing';
  } else {
    return undefined;
  }

  return newStatusType;
}

function makeArray(value) {
  let list = [];

  if (Array.isArray(value)) {
    list = [...value];
  }

  if (value != undefined) {
    list.push(value);
  }

  return list;
}
