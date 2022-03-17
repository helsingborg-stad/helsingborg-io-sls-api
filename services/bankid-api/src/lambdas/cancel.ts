import to from 'await-to-js';

import { AxiosInstance, AxiosError } from 'axios';
import { InternalServerError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';

import * as request from '../libs/request';
import * as response from '../libs/response';

import * as bankId from '../helpers/bankId';
import { BankIdSSMParams } from '../helpers/types';

const SSMParams = params.read(config.bankId.envsKeyName);

interface BankIdCancelLambdaRequest {
  orderRef: string;
}

interface BankIdCancelResponse {
  data?: Record<string, never>;
}

export async function main(event: { body: string }, context: { awsRequestId: string }) {
  const { orderRef } = JSON.parse(event.body);

  const [bankIdCancelError, bankIdCancelResponse] = await to(sendBankIdCancelRequest({ orderRef }));
  if (bankIdCancelError) {
    log.error(
      'Bank Id Cancel response error',
      context.awsRequestId,
      'service-bankid-api-cancel-001',
      bankIdCancelError ?? {}
    );
    return response.failure(new InternalServerError(String(bankIdCancelError)));
  }

  return response.success(200, {
    type: 'bankidCancel',
    attributes: bankIdCancelResponse?.data,
  });
}

async function sendBankIdCancelRequest(payload: BankIdCancelLambdaRequest) {
  const bankIdSSMparams: BankIdSSMParams = await SSMParams;

  const [axiosError, bankIdClient] = await to<AxiosInstance, AxiosError>(
    bankId.client(bankIdSSMparams)
  );
  if (axiosError) {
    throw axiosError;
  }

  const [cancelError, cancelResponse] = await to<BankIdCancelResponse>(
    request.call(bankIdClient, 'post', bankId.url(bankIdSSMparams.apiUrl, '/cancel'), payload)
  );
  if (cancelError) {
    throw cancelError;
  }

  return cancelResponse;
}
