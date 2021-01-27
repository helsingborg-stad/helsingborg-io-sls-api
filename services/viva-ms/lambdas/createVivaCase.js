/* eslint-disable no-console */
// import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import uuid from 'uuid';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
import { putItem } from '../../../libs/queries';
import * as dynamoDB from '../../../libs/dynamoDb';

const CASE_STATUS_OPEN_TO_APPLY = 'openToApply';
const CASE_PROVIDER_VIVA = 'VIVA';
const VIVA_RECURRING_FORM_ID = '0';
const SSMParams = params.read(config.vada.envsKeyName);

export const main = async event => {
  const { user } = event.detail;

  const [applicationStatusError, applicationStatusResponse] = await to(
    sendApplicationStatusRequest(user.personalNumber)
  );
  if (applicationStatusError) {
    return console.error('(Viva-ms) Viva Application Status Error', applicationStatusError);
  }

  if (!isApplicationPeriodOpen(applicationStatusResponse)) {
    return console.error(
      '(Viva-ms) syncApplicationStatus',
      'Application period is not open',
      applicationStatusResponse
    );
  }

  // Get and validate data from viva mypages
  const [myPagesError, myPagesResponse] = await to(sendMyPagesReguest(user.personalNumber));

  if (myPagesError) {
    return console.error('(Viva-ms) Viva My Pages Request Error', applicationStatusError);
  }

  const vivaApplication = myPagesResponse.person.application.vivaapplication;

  if (!vivaApplication || !vivaApplication.period) {
    return console.error('(Viva-ms) Viva Application Perid not present in response, aborting');
  }

  if (!vivaApplication || !vivaApplication.workflowid) {
    return console.error('(Viva-ms) Viva Application WorkflowId not present in response, aborting');
  }

  // Check if Cases with application workflowId exsits
  const params = {
    TableName: config.cases.TableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': `USER#${user.personalNumber}`,
      ':workflowId': vivaApplication.workflowid,
    },
  };

  const [dynamoQueryError, queryCasesResult] = await to(dynamoDB.call('query', params));
  if (dynamoQueryError) {
    return console.error('(Viva-ms) DynamoDb query on cases tabel failed', dynamoQueryError);
  }

  if (queryCasesResult.Items.length > 0) {
    return console.log('(Viva-ms) Case with workflowId already exsists');
  }

  // Create viva case with period and workflowId in details
  const id = uuid.v4();
  const PK = `USER#${user.personalNumber}`;
  const SK = `USER#${user.personalNumber}#CASE#${id}#PROVIDER#${CASE_PROVIDER_VIVA}#WORKFLOWID#${vivaApplication.workflowId}`;
  const timestamp = Date.now();

  const Item = {
    id,
    PK,
    SK,
    createdAt: timestamp,
    updatedAt: timestamp,
    expirationTime: 0,
    status: CASE_STATUS_OPEN_TO_APPLY,
    formId: VIVA_RECURRING_FORM_ID,
    provider: 'VIVA',
    details: {
      workflowId: vivaApplication.workflowid,
      period: vivaApplication.period,
    },
    answers: [],
    currentPosition: 1,
  };

  const putItemParams = {
    TableName: config.cases.tableName,
    Item,
  };

  const [putItemError] = await to(putItem(putItemParams));
  if (putItemError) {
    return console.error('(viva-ms) syncApplicationStatus', putItemError);
  }

  return true;
};

function isApplicationPeriodOpen(statusList) {
  /**
   * The Combination of Status Codes 1, 128, 256, 512 determines if a VIVA Application is open for recurring application
   * 1 - Application is allowed,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const requiredStatusCodes = [1, 128, 256, 512];
  const filteredStatusList = statusList.filter(status => requiredStatusCodes.includes(status.code));

  const isPeriodOpenForApplicant = filteredStatusList.length === requiredStatusCodes.length;
  if (isPeriodOpenForApplicant) {
    return true;
  }

  return false;
}

async function sendApplicationStatusRequest(personalNumber) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const hahsedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const authorizedRequestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationStatusUrl = `${vadaUrl}/applications/${hahsedPersonalNumber}/status`;

  const [requestError, vadaApplicationStatusResponse] = await to(
    request.call(authorizedRequestClient, 'get', vadaApplicationStatusUrl)
  );

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(requestError.response.status, requestError.response.data.message);
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, requestError.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, requestError.message);
    }
  }

  return vadaApplicationStatusResponse.data;
}

async function sendMyPagesReguest(personalNumber) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const authorizedRequestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaMypagesApplicationUrl = `${vadaUrl}/mypages/${hashedPersonalNumber}`;

  const [requestError, vadaResponse] = await to(
    request.call(authorizedRequestClient, 'get', vadaMypagesApplicationUrl)
  );

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(requestError.response.status, requestError.response.data.message);
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, requestError.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, requestError.message);
    }
  }

  return vadaResponse.data;
}
