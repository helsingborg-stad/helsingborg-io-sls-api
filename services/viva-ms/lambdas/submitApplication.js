/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event) {
  const [record] = event.Records;

  if (record.dynamodb.NewImage === undefined) {
    return undefined;
  }

  const caseObject = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);

  const [vivaError, sendApplicationsResponse] = await to(sendApplicationsToViva(caseObject));
  if (vivaError) {
    return console.error('(Viva-ms)', vivaError);
  }

  console.info('(Viva-ms)', sendApplicationsResponse);

  return true;
}

async function sendApplicationsToViva(caseObject) {
  const { PK, answers, workflowId, pdf } = caseObject;
  const personalNumber = PK.substring(5);
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberHashEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  // Construct imperative Viva API adapter payload
  const vadaApiPayload = {
    applicationType: 'recurrent', // basic | recurrent
    hashid: personalNumberHashEncoded,
    workflowId,
    answers,
    pdf,
  };

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationsUrl = `${vadaUrl}/applications`;

  const [error, vadaCreateRecurrentApplicationResponse] = await to(
    request.call(requestClient, 'post', vadaApplicationsUrl, vadaApiPayload)
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

  return vadaCreateRecurrentApplicationResponse.data;
}
