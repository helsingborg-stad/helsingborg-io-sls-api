/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import { getStatusByType, statusTypes } from '../../../libs/caseStatuses';

export async function main(event, context) {
  const { caseKeys, workflow } = event.detail;

  const newStatusType = decideNewCaseStatus(workflow.attributes);
  if (newStatusType == undefined) {
    return true;
  }

  const [updateCaseStatusError, newCaseStatus] = await to(
    updateCaseStatus(caseKeys, getStatusByType(newStatusType))
  );
  if (updateCaseStatusError) {
    log.error(
      'Could not update case status',
      context.awsRequestId,
      'service-viva-ms-decideCaseStatus-001',
      updateCaseStatusError
    );
  }

  log.info('New case status updated successfully', context.awsRequestId, null, newCaseStatus);
  return await putDecideCaseStatusEvent(caseKeys);
}

async function putDecideCaseStatusEvent(caseKeys) {
  const [putEventError] = await to(
    putEvent({ caseKeys }, 'vivaMsDecideCaseStatusSuccess', 'vivaMs.decideCaseStatus')
  );
  if (putEventError) {
    return console.error('(Viva-ms: decideCaseStatus) putEventError.', putEventError);
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
    ReturnValues: 'UPDATED_NEW',
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
    return statusTypes.ACTIVE_PROCESSING;
  }

  return undefined;
}

function getCaseStatusType(decisionTypeCode, paymentList) {
  if (decisionTypeCode === 1 && paymentList != undefined && paymentList.length > 0) {
    return statusTypes.CLOSED_APPROVED_VIVA;
  }

  if (decisionTypeCode === 2) {
    return statusTypes.CLOSED_REJECTED_VIVA;
  }

  if (decisionTypeCode === 3 && paymentList != undefined && paymentList.length > 0) {
    return statusTypes.CLOSED_PARTIALLY_APPROVED_VIVA;
  }

  return statusTypes.ACTIVE_PROCESSING;
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
