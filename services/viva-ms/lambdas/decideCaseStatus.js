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

  const decisionTypeCode = getDecisionTypeCode(decisionList);

  if (decisionTypeCode != undefined) {
    const caseStatus = getCaseStatusType(decisionTypeCode, paymentList);
    return caseStatus;
  }

  if (calculation != undefined) {
    return 'active:processing';
  }

  return undefined;
}

function getCaseStatusType(decisionTypeCode, paymentList) {
  if (decisionTypeCode === 1 && paymentList != undefined && paymentList.length > 0) {
    return 'closed:approved:viva';
  }

  if (decisionTypeCode === 2) {
    return 'closed:rejected:viva';
  }

  if (decisionTypeCode === 3 && paymentList != undefined && paymentList.length > 0) {
    return 'closed:partiallyApproved:viva';
  }

  return 'active:processing';
}

function getDecisionTypeCode(decisionList) {
  if (decisionList == undefined && decisionList.length == 0) {
    return undefined;
  }

  let typeCode = 0;

  decisionList.forEach(decision => {
    typeCode = typeCode | parseInt(decision.typecode, 10);
  });

  return typeCode;
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
