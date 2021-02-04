/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import uuid from 'uuid';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
import { putItem } from '../../../libs/queries';
import * as dynamoDB from '../../../libs/dynamoDb';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';
import { getStatusByType } from '../../../libs/caseStatuses';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const CASE_SSM_PARAMS = params.read(config.cases.envsKeyName);

export async function main(event) {
  const { user } = event.detail;

  const [applicationStatusError, applicationStatusResponse] = await to(
    sendApplicationStatusRequest(user.personalNumber)
  );
  if (applicationStatusError) {
    return console.error('(Viva-ms) Viva Application Status Error', applicationStatusError);
  }

  if (!isApplicationPeriodOpen(applicationStatusResponse)) {
    return console.info(
      '(Viva-ms) syncApplicationStatus',
      'Application period is not open',
      applicationStatusResponse
    );
  }

  const [myPagesError, myPagesResponse] = await to(sendMyPagesReguest(user.personalNumber));
  if (myPagesError) {
    return console.error('(Viva-ms) Viva My Pages Request Error', applicationStatusError);
  }

  const vivaApplication = myPagesResponse.person.application.vivaapplication;

  if (!vivaApplication || !vivaApplication.period) {
    return console.error('(Viva-ms) Viva Application Period not present in response, aborting');
  }

  if (!vivaApplication || !vivaApplication.workflowid) {
    return console.error(
      `(Viva-ms) Viva Application WorkflowId ${vivaApplication.workflowid} not present in response, aborting`
    );
  }

  const casePartitionKey = `USER#${user.personalNumber}`;
  const [queryCasesError, queryCaseItems] = await to(
    queryCasesWithWorkflowId(casePartitionKey, vivaApplication.workflowid)
  );
  if (queryCasesError) {
    return console.error('(Viva-ms) DynamoDb query on cases tabel failed', queryCasesError);
  }

  if (queryCaseItems.length > 0) {
    return console.log('(Viva-ms) Case with WorkflowId already exists');
  }

  const [putItemError] = await to(
    putRecurringVivaCase(casePartitionKey, vivaApplication.workflowid, vivaApplication.period)
  );
  if (putItemError) {
    return console.error('(viva-ms) syncApplicationStatus', putItemError);
  }

  return true;
}

async function queryCasesWithWorkflowId(PK, workflowId) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':workflowId': workflowId,
    },
  };

  const [dynamoQueryError, queryCasesResult] = await to(dynamoDB.call('query', params));
  if (dynamoQueryError) {
    throw dynamoQueryError;
  }

  return queryCasesResult.Items;
}

async function putRecurringVivaCase(PK, workflowId, period) {
  const ssmParams = await CASE_SSM_PARAMS;
  const id = uuid.v4();
  const timestampNow = Date.now();
  const initialStatus = getStatusByType('notStarted:viva');

  const putItemParams = {
    TableName: config.cases.tableName,
    Item: {
      id,
      PK,
      SK: `${PK}#CASE#${id}`,
      createdAt: timestampNow,
      updatedAt: timestampNow,
      formId: ssmParams.recurringFormId,
      status: initialStatus,
      provider: CASE_PROVIDER_VIVA,
      details: {
        workflowId,
        period,
      },
      answers: [],
      currentPosition: 1,
    },
  };

  const [putItemError, caseItem] = await to(putItem(putItemParams));
  if (putItemError) {
    throw putItemError;
  }

  return caseItem;
}

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
  const ssmParams = await VADA_SSM_PARAMS;

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
  const ssmParams = await VADA_SSM_PARAMS;

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
