/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
import { putEvent } from '../../../libs/awsEventBridge';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    return undefined;
  }

  const caseItem = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  if (vivaCaseSSMParams.recurringFormId !== caseItem.currentFormId) {
    console.info('(Viva-ms): currentFormId does not match recurringFormId');
    return true;
  }

  const vadaSSMParams = await VADA_SSM_PARAMS;
  const { hashSalt, hashSaltLength } = vadaSSMParams;
  const personalNumber = caseItem.PK.substring(5);
  const personalNumberHashEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const applicationRequestBody = getApplicationRequestBody(caseItem, personalNumberHashEncoded);

  const [sendApplicationError, sendApplicationsResponse] = await to(
    sendApplicationsToViva(applicationRequestBody)
  );
  if (sendApplicationError) {
    return console.error('(Viva-ms)', sendApplicationError);
  }
  console.info('(Viva-ms)', sendApplicationsResponse);

  const caseKeys = {
    PK: caseItem.PK,
    SK: caseItem.SK,
  };

  const [putEventError] = await to(
    putEvent(
      {
        personalNumberHashEncoded,
        caseKeys,
      },
      'vivaMsSubmitApplicationSuccess',
      'vivaMs.submitApplication'
    )
  );
  if (putEventError) {
    throw putEventError;
  }
}

async function sendApplicationsToViva(applicationRequestBody) {
  const vadaSSMParams = await VADA_SSM_PARAMS;
  const { vadaUrl, xApiKeyToken } = vadaSSMParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationsUrl = `${vadaUrl}/applications`;

  const [error, vadaCreateRecurrentVivaApplicationResponse] = await to(
    request.call(requestClient, 'post', vadaApplicationsUrl, applicationRequestBody)
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

  return vadaCreateRecurrentVivaApplicationResponse.data;
}

function getApplicationRequestBody(caseItem, personalNumberHashEncoded) {
  const {
    forms: {
      [caseItem.currentFormId]: { answers },
    },
    details: { workflowId },
    pdf: pdfBinaryBuffer,
  } = caseItem;

  const requestBody = {
    applicationType: 'recurrent', // basic | recurrent
    hashid: personalNumberHashEncoded,
    workflowId,
    answers,
    rawData: pdfBinaryBuffer.toString(),
    rawDataType: 'pdf',
  };

  return requestBody;
}
