/* eslint-disable no-console */
// import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

export const main = async event => {
  const { user: personalNumber } = event.detail;

  const [applicationStatusError, applicationStatusResponse] = await to(
    sendApplicationStatusRequest(personalNumber)
  );
  if (applicationStatusError) {
    return console.error('(Viva-ms) syncStatus', applicationStatusError);
  }

  console.log('(Viva-ms) syncStatus', applicationStatusResponse);

  return true;
};

async function sendApplicationStatusRequest(personalNumber) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationStatusUrl = `${vadaUrl}/application/status/${personalNumberEncoded}`;

  const [error, vadaApplicationStatusResponse] = await to(
    request.call(requestClient, 'get', vadaApplicationStatusUrl, null)
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

  return vadaApplicationStatusResponse.data;
}
