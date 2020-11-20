/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * Handler reacting on case event
 */
export const main = async event => {
  if (event.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  // Make DynamoDb data readable by the Viva API adapter
  const unmarshalledData = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const [error, vadaResponse] = await to(sendVadaMyPagesRequest(unmarshalledData));
  if (error) {
    return console.error('(Viva-ms) syncOfficers', error);
  }

  const { vivacases } = vadaResponse.data.person.cases;
  console.log('(Viva-ms) syncOfficers - vivacases', vivacases);

  // If administrators array not exists update case

  // else sync with admins data from viva

  console.info('(Viva-ms) syncOfficers - vadaResponse.data', vadaResponse.data);

  return true;
};

/**
 * Handler sending GET mypages call to Viva API adapter
 */
async function sendVadaMyPagesRequest(caseData) {
  const { PK } = caseData;
  const personalNumber = PK.substring(5);
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaMyPagesUrl = `${vadaUrl}/mypages/${personalNumberEncoded}`;

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

  return vadaMyPagesResponse;
}
