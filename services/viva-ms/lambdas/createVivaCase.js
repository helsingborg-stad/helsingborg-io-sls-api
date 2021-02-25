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
import { getApplicationStatus, isApplicationStatusCorrect } from '../helpers/applicationStatus';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const { user } = event.detail;
  const vadaSSMParams = await VADA_SSM_PARAMS;

  const hahsedPersonalNumber = hash.encode(
    user.personalNumber,
    vadaSSMParams.hashSalt,
    vadaSSMParams.hashSaltLength
  );
  const [applicationStatusError, applicationStatusResponse] = await to(
    getApplicationStatus(hahsedPersonalNumber, vadaSSMParams)
  );
  if (applicationStatusError) {
    return console.error('(Viva-ms) Viva Application Status', applicationStatusError);
  }

  /**
   * The Combination of Status Codes 1, 128, 256, 512
   * determines if a VIVA Application Workflow is open for applicant.
   * 1 - Application is open for applicant,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const requiredStatusCodes = [1, 128, 256, 512];
  if (!isApplicationStatusCorrect(applicationStatusResponse, requiredStatusCodes)) {
    return console.info(
      '(Viva-ms) syncApplicationStatus',
      'Application period is not open',
      applicationStatusResponse
    );
  }

  const [myPagesError, myPagesResponse] = await to(sendMyPagesReguest(user.personalNumber));
  if (myPagesError) {
    return console.error('(Viva-ms) Viva My Pages Request', applicationStatusError);
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

  const period = {
    startDate: Date.parse(vivaApplication.period.start),
    endDate: Date.parse(vivaApplication.period.end),
  };

  const [putItemError] = await to(
    putRecurringVivaCase(casePartitionKey, vivaApplication.workflowid, period)
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
  const ssmParams = await VIVA_CASE_SSM_PARAMS;
  const { recurringFormId, randomCheckFormId } = ssmParams;
  const id = uuid.v4();
  const timestampNow = Date.now();
  const initialStatus = getStatusByType('notStarted:viva');

  const initialFormAttributes = {
    answers: [],
    currentPosition: {
      currentMainStep: 1,
      currentMainStepIndex: 0,
      index: 0,
      level: 0,
    },
  };

  const initialForms = {
    [recurringFormId]: initialFormAttributes,
    [randomCheckFormId]: initialFormAttributes,
  };

  const putItemParams = {
    TableName: config.cases.tableName,
    Item: {
      id,
      PK,
      SK: `${PK}#CASE#${id}`,
      createdAt: timestampNow,
      updatedAt: timestampNow,
      status: initialStatus,
      provider: CASE_PROVIDER_VIVA,
      details: {
        workflowId,
        period,
      },
      currentFormId: recurringFormId,
      forms: initialForms,
    },
  };

  const [putItemError, caseItem] = await to(putItem(putItemParams));
  if (putItemError) {
    throw putItemError;
  }

  return caseItem;
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
