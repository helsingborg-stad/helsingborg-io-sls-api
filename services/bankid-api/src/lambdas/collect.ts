import to from 'await-to-js';

import { AxiosInstance, AxiosError } from 'axios';
import { throwError, InternalServerError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import secrets from '../libs/secrets';

import * as request from '../libs/request';
import * as response from '../libs/response';

import { putEvent } from '../libs/awsEventBridge';
import { signToken } from '../libs/token';

import * as bankId from '../helpers/bankId';
import { BankIdError, BankIdSSMParams } from '../helpers/types';

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

export async function main(
  event: { body: string; headers: Record<string, string> },
  context: { awsRequestId: string }
) {
  const { body, headers } = event;
  const { orderRef } = JSON.parse(body);

  const [bankIdCollectRequestError, bankIdCollectResponse] = await to(
    sendBankIdCollectRequest({ orderRef })
  );
  if (bankIdCollectRequestError) {
    log.error(
      'Bank Id Collect request error',
      context.awsRequestId,
      'service-bankid-api-collect-001',
      bankIdCollectRequestError
    );
    response.failure(new InternalServerError(bankIdCollectRequestError.message));
    return false;
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

  return response.success(200, {
    type: 'bankIdCollect',
    attributes: responseAttributes,
  });
}

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

async function sendBankIdCollectRequest(payload: BankIdCollectLambdaRequest) {
  const bankIdSSMparams: BankIdSSMParams = await SSMParams;

  const [axiosError, bankIdClient] = await to<AxiosInstance, AxiosError>(
    bankId.client(bankIdSSMparams)
  );
  if (axiosError) {
    throw axiosError;
  }

  const [collectError, collectResponse] = await to<BankIdCollectResponse, BankIdError>(
    request.call(bankIdClient, 'post', bankId.url(bankIdSSMparams.apiUrl, '/collect'), payload)
  );
  if (collectError) {
    if (collectError?.response.data?.details === 'No such order') {
      throwError(404, collectError.response.data.details);
    }
    throwError(collectError?.response.status, collectError?.response.data?.details || '');
  }

  return collectResponse;
}
