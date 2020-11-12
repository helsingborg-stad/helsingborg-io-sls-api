/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import { CASE_PROVIDER_VIVA, CASE_STATUS_SUBMITTED } from '../../../libs/constants';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * Handler reacting on event stream triggered by DynamoDB cases table
 */
export const main = async event => {
  const [record] = event.Records;

  if (record.dynamodb.NewImage === undefined) {
    return null;
  }

  // Make DynamoDb data readable by the Viva API adapter
  const unmarshalledData = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);

  if (!checkIsVivaCase(unmarshalledData)) {
    return null;
  }

  const [error, vadaResponse] = await to(sendVadaRequest(unmarshalledData));
  if (error) {
    return console.error('(Viva-ms)', error);
  }

  console.info('(Viva-ms)', vadaResponse.data);

  return true;
};

/**
 * Helper to ensure we only handling cases of viva type
 * @param {object} data
 * @returns {boolean}
 */
function checkIsVivaCase(data) {
  const isCaseProviderViva = data.provider === CASE_PROVIDER_VIVA;
  const isCaseStatusSubmitted = data.status === CASE_STATUS_SUBMITTED;
  if (!isCaseProviderViva || !isCaseStatusSubmitted) {
    return false;
  }
  return true;
}

/**
 * Handler responsible for sending a POST call to Viva API adapter,
 * which in turn creates a case in Viva
 */
async function sendVadaRequest(caseData) {
  const {
    PK,
    details: { period },
    answers,
  } = caseData;
  const personalNumber = PK.substring(5);
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  // Construct imperative Viva API adapter payload
  const vadaPayload = {
    applicationType: 'recurrent', // basic | recurrent
    personalNumber: personalNumberEncoded,
    clientIp: '0.0.0.0',
    workflowId: '',
    period,
    answers,
  };

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationsUrl = `${vadaUrl}/applications`;

  const [error, vadaCreateRecurrentApplicationResponse] = await to(
    request.call(requestClient, 'post', vadaApplicationsUrl, vadaPayload)
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

  return vadaCreateRecurrentApplicationResponse;
}
