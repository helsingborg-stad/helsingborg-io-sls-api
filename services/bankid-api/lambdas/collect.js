import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import params from '../../../libs/params';
import * as request from '../../../libs/request';
import * as response from '../../../libs/response';
import * as bankId from '../helpers/bankId';
import secrets from '../../../libs/secrets';
import { signToken } from '../../../libs/token';

const SSMParams = params.read(config.bankId.envsKeyName);
const CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE = config.auth.secrets.authorizationCode;

export const main = async event => {
  const { orderRef } = JSON.parse(event.body);
  const bankidSSMParams = await SSMParams;

  const payload = { orderRef };

  const [bankIdCollectRequestError, bankIdCollectResponse] = await to(
    sendBankIdCollectRequest(bankidSSMParams, payload)
  );

  if (bankIdCollectRequestError) return response.failure(bankIdCollectRequestError);

  let responseAttributes = {};

  if (bankIdCollectResponse.data && bankIdCollectResponse.data.status !== 'complete') {
    responseAttributes = bankIdCollectResponse.data;
  }

  if (bankIdCollectResponse.data && bankIdCollectResponse.data.status === 'complete') {
    await putEvent(
      bankIdCollectResponse.data.completionData,
      'BankIdCollectComplete',
      'bankId.collect'
    );

    const [generateAuthorizationCodeError, authorizationCode] = await to(
      generateAuthorizationCode(bankIdCollectResponse.data.user.personalNumber)
    );

    if (generateAuthorizationCodeError) {
      return response.failure(generateAuthorizationCodeError);
    }

    responseAttributes = {
      authorizationCode,
      ...bankIdCollectResponse.data,
    };
  }

  return response.success(200, {
    type: 'bankIdCollect',
    attributes: responseAttributes,
  });
};

/**
 * Function for generating a authorization code, to be used for obtaining a access token.
 * @param {object} payload a object with only one level of depth.
 * @returns JWT (Json Web Token)
 */
async function generateAuthorizationCode(payload) {
  const [authorizationCodeSecretError, auhtorizationCodeSecret] = await to(
    secrets.get(
      CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.name,
      CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.name
    )
  );
  if (authorizationCodeSecretError) {
    throwError(authorizationCodeSecretError.code, authorizationCodeSecretError.message);
  }

  const tokenExpireTimeInMinutes = 5;
  const [signTokenError, signedToken] = await to(
    signToken(payload, auhtorizationCodeSecret, tokenExpireTimeInMinutes)
  );
  if (signTokenError) {
    throw signTokenError;
  }

  return signedToken;
}

async function sendBankIdCollectRequest(params, payload) {
  let error, bankIdClientResponse, bankIdCollectResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [error, bankIdCollectResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/collect'), payload)
  );
  if (!bankIdCollectResponse) {
    if (error.response.data.details === 'No such order') {
      throwError(404, error.response.data.details);
    }
    throwError(error.response.status, error.response.data.details);
  }

  return bankIdCollectResponse;
}
