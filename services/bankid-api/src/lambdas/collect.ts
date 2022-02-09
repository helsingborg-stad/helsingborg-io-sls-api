/* eslint-disable no-console */
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../libs/config';
import { putEvent } from '../libs/awsEventBridge';
import params from '../libs/params';
import * as request from '../libs/request';
import * as response from '../libs/response';
import * as bankId from '../helpers/bankId';
import secrets from '../libs/secrets';
import { signToken } from '../libs/token';
import log from '../libs/logs';
import { BankIdError, BankIdParams } from 'helpers/types';

const SSMParams = params.read(config.bankId.envsKeyName);
const CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE = config.auth.secrets.authorizationCode;

interface BankIdCollectLambdaRequest {
  orderRef: string;
}

interface BankIdCollectResponse {
  data: {
    status: string;
    completionData: {
      user: {
        personalNumber: string;
      };
    };
  };
}

export const main = async (
  event: { body: string; headers: Record<string, string> },
  context: { awsRequestId: string }
) => {
  const { body, headers } = event;
  const { orderRef } = JSON.parse(body);

  const bankidSSMParams = await SSMParams;

  console.info('🚀 ~ file: collect.js ~ line 21 ~ headers -> User-Agent', headers['User-Agent']);

  const payload: BankIdCollectLambdaRequest = { orderRef };

  const [bankIdCollectRequestError, bankIdCollectResponse] = await to<
    BankIdCollectResponse | undefined,
    BankIdError
  >(sendBankIdCollectRequest(bankidSSMParams, payload));

  if (bankIdCollectRequestError) {
    log.error(
      'Bank Id Collect request error',
      context.awsRequestId,
      'service-bankid-api-collect-001',
      bankIdCollectRequestError
    );

    return response.failure(bankIdCollectRequestError);
  }

  let responseAttributes = {};

  if (!isBankidCollectStatusComplete(bankIdCollectResponse?.data)) {
    responseAttributes = bankIdCollectResponse?.data ?? {};
  }

  if (isBankidCollectStatusComplete(bankIdCollectResponse?.data)) {
    responseAttributes = {
      ...bankIdCollectResponse?.data,
    };
  }

  if (
    isUserAgentMittHelsingborgApp(headers) &&
    isBankidCollectStatusComplete(bankIdCollectResponse?.data)
  ) {
    await putEvent(
      bankIdCollectResponse?.data.completionData ?? {},
      'BankIdCollectComplete',
      'bankId.collect'
    );

    const personalNumber = bankIdCollectResponse?.data.completionData.user.personalNumber;

    const [generateAuthorizationCodeError, authorizationCode] = await to(
      generateAuthorizationCode(personalNumber ?? '')
    );

    if (generateAuthorizationCodeError) {
      log.error(
        'Bank Id Authorization code error',
        context.awsRequestId,
        'service-bankid-api-collect-002',
        bankIdCollectRequestError ?? {}
      );

      return response.failure(generateAuthorizationCodeError);
    }

    responseAttributes = {
      authorizationCode,
      ...responseAttributes,
    };
  }

  console.info('🚀 ~ file: collect.js ~ line 70 ~ responseAttributes', responseAttributes);

  return response.success(200, {
    type: 'bankIdCollect',
    attributes: responseAttributes,
  });
};

function isBankidCollectStatusComplete(responseData: BankIdCollectResponse['data'] | undefined) {
  return responseData && responseData.status === 'complete';
}

function isUserAgentMittHelsingborgApp(headers: Record<string, string>) {
  const { ['User-Agent']: userAgent } = headers;
  const searchElementRegex = /^Mitt\s?Helsingborg.*$/;
  return searchElementRegex.test(userAgent);
}

async function generateAuthorizationCode(personalNumber: string) {
  type AuthError = {
    code: number;
    message: string;
  };
  const [authorizationCodeSecretError, auhtorizationCodeSecret] = await to<string, AuthError>(
    secrets.get(
      CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.name,
      CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.keyName
    )
  );
  if (authorizationCodeSecretError) {
    throwError(authorizationCodeSecretError.code, authorizationCodeSecretError.message);
  }

  const signTokenPayload = {
    personalNumber,
  };

  const tokenExpireTimeInMinutes = 5;
  const [signTokenError, signedToken] = await to(
    signToken(signTokenPayload, auhtorizationCodeSecret ?? '', tokenExpireTimeInMinutes)
  );
  if (signTokenError) {
    throwError(500, signTokenError.message);
  }

  return signedToken;
}

async function sendBankIdCollectRequest(
  params: BankIdParams,
  payload: BankIdCollectLambdaRequest
): Promise<BankIdCollectResponse | undefined> {
  const [, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  const [error, bankIdCollectResponse] = await to<BankIdCollectResponse, BankIdError>(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/collect'), payload)
  );
  if (!bankIdCollectResponse) {
    if (error?.response.data?.details === 'No such order') {
      throwError(404, error.response.data.details);
    }
    throwError(error?.response.status, error?.response.data?.details);
  }

  return bankIdCollectResponse;
}
