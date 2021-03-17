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
      sendVadaMyPagesRequest(personalNumber, workflowId)
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

  return await dynamoDb.call('query', params);
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
