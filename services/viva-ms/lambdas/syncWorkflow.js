/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';

const SSMParams = params.read(config.vada.envsKeyName);

const CASE_WORKFLOW_PATH = 'details.workflow';

export async function main(event) {
  const personalNumber = event.detail.user.personalNumber;
  const PK = `USER#${personalNumber}`;

  const allUserCases = await getAllUserCases(PK);

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

  const [error, casesGetResponse] = await to(dynamoDb.call('query', params));
  if (error) {
    return console.error('(Viva-ms) syncWorkflow', error);
  }

  return casesGetResponse;
}

async function syncCaseWorkflows(cases, personalNumber) {
  const caseItems = cases.Items;

  for (const caseItem of caseItems) {
    const workflowId = caseItem.details.workflowId;

    if (!workflowId) {
      continue;
    }

    const [vadaMyPagesError, vadaMyPagesResponse] = await to(
      sendVadaMyPagesRequest(personalNumber, workflowId)
    );
    if (vadaMyPagesError) {
      return console.error('(Viva-ms) syncWorkflow', vadaMyPagesError);
    }

    if (!deepEqual(vadaMyPagesResponse.attributes, caseItem.details.workflow)) {
      await syncWorkflowAndStatus(caseItem.PK, caseItem.SK, vadaMyPagesResponse.attributes);
    }
  }
}

async function sendVadaMyPagesRequest(personalNumber, workflowId) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);
  const { vadaUrl, xApiKeyToken } = ssmParams;

  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaMyPagesUrl = `${vadaUrl}/mypages/${personalNumberEncoded}/workflows/${workflowId}`;

  const [error, vadaMyPagesResponse] = await to(
    request.call(requestClient, 'get', vadaMyPagesUrl, null)
  );

  if (error) {
    if (error.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(error.response.status, error.response.data.message);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, error.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, error.message);
    }
  }

  return vadaMyPagesResponse.data;
}

async function syncWorkflowAndStatus(PK, SK, workflow) {
  const TableName = config.cases.tableName;
  let UpdateExpression = `SET ${CASE_WORKFLOW_PATH} = :newWorkflow`;
  const ExpressionAttributeValues = { ':newWorkflow': workflow };
  const ExpressionAttributeNames = {};

  if (workflow.decision?.decisions?.decision?.type === 'Beviljat') {
    UpdateExpression += ', #status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = getStatusByType('closed:approved:viva');
  } else if (workflow.calculations) {
    UpdateExpression += ', #status = :newStatus';
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = getStatusByType('active:processing');
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
