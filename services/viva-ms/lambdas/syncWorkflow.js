import to from 'await-to-js';
import deepEqual from 'deep-equal';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import AWS from 'aws-sdk';
const dynamoDbConverter = AWS.DynamoDB.Converter;

import config from '../../../config';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb';
import * as request from '../../../libs/request';
import hash from '../../../libs/helperHashEncode';

const SSMParams = params.read(config.vada.envsKeyName);

const CASE_WORKFLOWS_PATH = 'details.workflows';

export const main = async event => {
  if (event.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  const { PK, SK, details } = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);
  const personalNumber = PK.substring(5);
  const { workflowId, workflows: caseWorkflows } = details;

  const [vadaMyPagesError, vadaMyPagesResponse] = await to(
    sendVadaMyPagesRequest(personalNumber, workflowId)
  );
  if (vadaMyPagesError) {
    return console.error('(Viva-ms) syncWorkflow VADA request error', vadaMyPagesError);
  }

  const { workflows: vadaWorkflows } = vadaMyPagesResponse.attributes;

  // Check if workflow info is in sync.
  if (deepEqual(vadaWorkflows, caseWorkflows)) {
    return null;
  }

  await addWorkflowsToCase(PK, SK, vadaWorkflows);

  return true;
};

// eslint-disable-next-line no-unused-vars
async function sendVadaMyPagesRequest(personalNumber, workflowId) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);
  const { vadaUrl, xApiKeyToken } = ssmParams;

  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  // const vadaMyPagesUrl = `${vadaUrl}/mypages/${personalNumberEncoded}/workflows/${workflowId}`;
  const vadaMyPagesUrl = `${vadaUrl}/mypages/${personalNumberEncoded}/workflows`;

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

async function addWorkflowsToCase(PK, SK, workflows) {
  const TableName = config.cases.tableName;
  const UpdateExpression = `SET ${CASE_WORKFLOWS_PATH} = :newTestWorkflows`;
  const ExpressionAttributeValues = { ':newTestWorkflows': workflows };

  const params = {
    TableName,
    Key: { PK, SK },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  const [updateError] = await to(dynamoDb.call('update', params));
  if (updateError) {
    console.log('(Viva-ms) syncWorkflow update error', updateError);
    return false;
  }

  return true;
}
