/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { getStatusByType } from '../libs/caseStatuses';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import decideNewCaseStatus from '../helpers/caseDecision';

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

  const [putEventError] = await to(putVivaMsEvent.decideCaseStatusSuccess({ caseKeys }));
  if (putEventError) {
    log.error(
      'Could not put decide status success event',
      context.awsRequestId,
      'service-viva-ms-decideCaseStatus-002',
      putEventError
    );
    return false;
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
