/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';

export async function main(event) {
  const { caseKeys, workflow } = event.detail;

  const newStatusType = decideNewCaseStatus(workflow.attributes);
  if (newStatusType == undefined) {
    console.info('(Viva-ms) no new status to update');
    return true;
  }

  const [updateCaseStatusError] = await to(
    updateCaseStatus(caseKeys, getStatusByType(newStatusType))
  );
  if (updateCaseStatusError) {
    console.error('(Viva-ms) updateCaseStatusError', updateCaseStatusError);
  }

  return true;
}

async function updateCaseStatus(caseKeys, newStatus) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: caseKeys,
    UpdateExpression: 'SET #status = :newStatusType',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':newStatusType': newStatus },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}

function decideNewCaseStatus(workflowAttributes) {
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
