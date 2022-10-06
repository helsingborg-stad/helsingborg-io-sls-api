import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import { AxiosInstance, AxiosError } from 'axios';
import to from 'await-to-js';

import * as response from '../libs/response';
import * as request from '../libs/request';
import secrets from '../libs/secrets';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import { putEvent } from '../libs/awsEventBridge';
import { signToken } from '../libs/token';

import { BankIdError, BankIdSSMParams } from '../helpers/types';
import * as bankId from '../helpers/bankId';

const CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE = config.auth.secrets.authorizationCode;

interface BankIdCollectLambdaRequest {
  orderRef: string;
}

type BankIdStatus = 'pending' | 'complete' | 'failed';

interface BankIdCollectData {
  status: BankIdStatus;
  completionData: {
    user: {
      personalNumber: string;
    };
  };
}

interface ResponseAttributes extends Partial<BankIdCollectData> {
  authorizationCode?: string;
}

interface BankIdCollectResponse {
  data: BankIdCollectData;
}

export interface Dependencies {
  sendBankIdCollectRequest: (
    parameters: BankIdCollectLambdaRequest
  ) => Promise<BankIdCollectResponse | undefined>;
  generateAuthorizationCode: (personalNumber: string) => Promise<string | undefined>;
}

export interface LambdaRequest {
  body: string;
  headers: Record<string, string>;
}

function isBankidCollectStatusComplete(responseData: BankIdCollectResponse['data'] | undefined) {
  return responseData?.status === 'complete';
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
  payload: BankIdCollectLambdaRequest
): Promise<BankIdCollectResponse | undefined> {
  const bankIdSSMparams: BankIdSSMParams = await params.read(config.bankId.envsKeyName);

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

export async function collect(input: LambdaRequest, dependencies: Dependencies) {
  const { body, headers } = input;
  const { orderRef } = JSON.parse(body);

  const [bankIdCollectRequestError, bankIdCollectResponse] = await to(
    dependencies.sendBankIdCollectRequest({ orderRef })
  );

  if (bankIdCollectRequestError) {
    log.error(
      'Bank Id Collect request error',
      'context.awsRequestId',
      'service-bankid-api-collect-001',
      bankIdCollectRequestError
    );
    return response.failure(bankIdCollectRequestError, {
      type: 'bankIdCollect',
    });
  }

  let responseAttributes: ResponseAttributes = {
    ...(bankIdCollectResponse?.data ?? {}),
  };

  if (
    isUserAgentMittHelsingborgApp(headers) &&
    isBankidCollectStatusComplete(bankIdCollectResponse?.data)
  ) {
    await putEvent(responseAttributes, 'BankIdCollectComplete', 'bankId.collect');

    const personalNumber = bankIdCollectResponse?.data.completionData.user.personalNumber;
    const [generateAuthorizationCodeError, authorizationCode] = await to(
      dependencies.generateAuthorizationCode(personalNumber ?? '')
    );
    if (generateAuthorizationCodeError) {
      log.error(
        'Bank Id Authorization code error',
        'context.awsRequestId',
        'service-bankid-api-collect-002',
        generateAuthorizationCodeError ?? {}
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

export const main = log.wrap(async event => {
  return collect(event, {
    sendBankIdCollectRequest,
    generateAuthorizationCode,
  });
});
