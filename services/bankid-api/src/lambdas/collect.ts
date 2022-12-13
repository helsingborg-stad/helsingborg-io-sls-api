import lambdaWrapper from '../libs/lambdaWrapper';
import { putEvent } from '../libs/awsEventBridge';
import * as request from '../libs/request';
import { signToken } from '../libs/token';
import secrets from '../libs/secrets';
import params from '../libs/params';
import config from '../libs/config';
import type { PutEventOptions } from '../libs/eventBridge';

import * as bankId from '../helpers/bankId';

import type { BankIdSSMParams } from '../helpers/types';

const CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE = config.auth.secrets.authorizationCode;

interface BankIdCollectLambdaRequest {
  orderRef: string;
}

type BankIdStatus = 'pending' | 'complete' | 'failed';

interface User {
  personalNumber: string;
}

interface BankIDCompletionData {
  user: User;
}

interface BankIdCollectData {
  status: BankIdStatus;
  completionData: BankIDCompletionData;
}

export interface FunctionResponse extends Partial<BankIdCollectData> {
  authorizationCode?: string;
}

interface BankIdCollectResponse {
  data: BankIdCollectData;
}

interface SuccessEventDetail {
  user: User;
}

export interface Dependencies {
  sendBankIdCollectRequest: (
    parameters: BankIdCollectLambdaRequest
  ) => Promise<BankIdCollectResponse>;
  generateAuthorizationCode: (personalNumber: string) => Promise<string | undefined>;
  sendBankIdStatusCompleteEvent: (
    detail: SuccessEventDetail,
    detailType: string,
    source: string
  ) => Promise<void>;
}

export interface FunctionInput {
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

async function generateAuthorizationCode(personalNumber: string): Promise<string | undefined> {
  const auhtorizationCodeSecret = await secrets.get(
    CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.name,
    CONFIG_AUTH_SECRETS_AUTHORIZATION_CODE.keyName
  );

  const tokenExpireTimeInMinutes = 5;
  const signedToken = await signToken(
    { personalNumber },
    auhtorizationCodeSecret ?? '',
    tokenExpireTimeInMinutes
  );

  return signedToken;
}

async function sendBankIdCollectRequest(
  payload: BankIdCollectLambdaRequest
): Promise<BankIdCollectResponse> {
  const bankIdSSMparams: BankIdSSMParams = await params.read(config.bankId.envsKeyName);
  const bankIdClient = await bankId.client(bankIdSSMparams);

  const collectResult = await request.call(
    bankIdClient,
    'post',
    bankId.url(bankIdSSMparams.apiUrl, '/collect'),
    payload
  );

  return collectResult;
}

export async function collect(
  input: FunctionInput,
  dependencies: Dependencies
): Promise<FunctionResponse> {
  const { body, headers } = input;
  const { orderRef } = JSON.parse(body);

  const bankIdCollectResponse = await dependencies.sendBankIdCollectRequest({ orderRef });

  let responseAttributes: FunctionResponse = {
    ...bankIdCollectResponse.data,
  };

  if (
    isUserAgentMittHelsingborgApp(headers) &&
    isBankidCollectStatusComplete(bankIdCollectResponse?.data)
  ) {
    await dependencies.sendBankIdStatusCompleteEvent(
      { ...bankIdCollectResponse.data.completionData },
      'BankIdCollectComplete',
      'bankId.collect'
    );

    const personalNumber = bankIdCollectResponse?.data?.completionData?.user?.personalNumber ?? '';
    const authorizationCode = await dependencies.generateAuthorizationCode(personalNumber);

    responseAttributes = {
      authorizationCode,
      ...responseAttributes,
    };
  }

  return responseAttributes;
}

export const main = lambdaWrapper(collect, {
  sendBankIdCollectRequest: sendBankIdCollectRequest,
  generateAuthorizationCode: generateAuthorizationCode,
  sendBankIdStatusCompleteEvent: putEvent,
});
