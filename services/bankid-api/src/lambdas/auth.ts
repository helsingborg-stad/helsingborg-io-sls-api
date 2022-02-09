/* eslint-disable no-console */
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../libs/config';
import params from '../libs/params';
import * as request from '../libs/request';
import * as response from '../libs/response';
import * as bankId from '../helpers/bankId';
import log from '../libs/logs';
import { BankIdError, BankIdParams } from 'helpers/types';
import { AxiosInstance } from 'axios';

const SSMParams = params.read(config.bankId.envsKeyName);

interface BankIdAuthLambdaRequest {
  endUserIp: string;
  personalNumber: string;
}

interface BankIdAuthResponse {
  data: {
    type: 'bankIdAuth';
    attributes: {
      orderRef: string;
      autoStartToken: string;
      qrStartToken: string;
      qrStartSecret: string;
    };
  };
}

export const main = async (event: { body: string }, context: { awsRequestId: string }) => {
  const { endUserIp, personalNumber } = JSON.parse(event.body);
  const bankIdSSMparams = await SSMParams;

  const payload: BankIdAuthLambdaRequest = {
    endUserIp,
    personalNumber,
  };

  log.info('Bank Id Auth input', context.awsRequestId, 'service-bankid-api-auth-000', {
    endUserIp,
    personalNumber: personalNumber?.slice(2, 9),
  });

  const [error, bankIdAuthResponse] = await to(sendBankIdAuthRequest(bankIdSSMparams, payload));
  if (!bankIdAuthResponse) {
    log.error(
      'Bank Id Auth response error',
      context.awsRequestId,
      'service-bankid-api-auth-001',
      error ?? {}
    );

    return response.failure(error);
  }

  const attributes = bankIdAuthResponse.data ? bankIdAuthResponse.data : {};

  return response.success(200, {
    type: 'bankIdAuth',
    attributes,
  });
};

async function sendBankIdAuthRequest(
  params: BankIdParams,
  payload: BankIdAuthLambdaRequest
): Promise<BankIdAuthResponse | undefined> {
  const [, bankIdClientResponse] = await to<AxiosInstance>(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  const [authError, bankIdAuthResponse]: [BankIdError | null, BankIdAuthResponse | undefined] =
    await to<BankIdAuthResponse, BankIdError>(
      request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/auth'), payload)
    );

  if (!bankIdAuthResponse)
    throwError(authError?.response.status, authError?.response.data?.details);

  return bankIdAuthResponse;
}
