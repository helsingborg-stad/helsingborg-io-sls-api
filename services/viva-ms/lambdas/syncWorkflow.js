import AWS from 'aws-sdk';
import to from 'await-to-js';
import deepEqual from 'deep-equal';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
const dynamoDbConverter = AWS.DynamoDB.Converter;

import config from '../../../config';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb';
import * as request from '../../../libs/request';
import hash from '../../../libs/helperHashEncode';

const SSMParams = params.read(config.vada.envsKeyName);

const CASE_WORKFLOW_PATH = 'details.workflow';

export async function main(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    return false;
  }

  const { PK, SK, details } = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);
  const personalNumber = PK.substring(5);
  const { workflowId, workflow: caseWorkflow } = details;

  if (!workflowId) {
    return false;
  }

  const [vadaMyPagesError, vadaMyPagesResponse] = await to(
    sendVadaMyPagesRequest(personalNumber, workflowId)
  );
  if (vadaMyPagesError) {
    return console.error('(Viva-ms) syncWorkflow VADA request error', vadaMyPagesError);
  }

  const vadaWorkflow = vadaMyPagesResponse.attributes;

  if (deepEqual(vadaWorkflow, caseWorkflow)) {
    return false;
  }

  await addWorkflowToCase(PK, SK, vadaWorkflow);

  return true;
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

async function addWorkflowToCase(PK, SK, workflow) {
  const TableName = config.cases.tableName;
  const UpdateExpression = `SET ${CASE_WORKFLOW_PATH} = :newWorkflow`;
  const ExpressionAttributeValues = { ':newWorkflow': workflow };

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
