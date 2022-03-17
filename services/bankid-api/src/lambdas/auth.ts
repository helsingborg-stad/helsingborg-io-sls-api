import to from 'await-to-js';

import { AxiosInstance, AxiosError } from 'axios';
import { InternalServerError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';

import * as request from '../libs/request';
import * as response from '../libs/response';

import * as bankId from '../helpers/bankId';
import { BankIdError, BankIdSSMParams } from '../helpers/types';

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

export async function main(event: { body: string }, context: { awsRequestId: string }) {
  const { endUserIp, personalNumber } = JSON.parse(event.body);

  log.info('Bank Id Auth input', context.awsRequestId, 'service-bankid-api-auth-000', {
    endUserIp,
    personalNumber: personalNumber?.slice(2, 9),
  });

  const payload: BankIdAuthLambdaRequest = {
    endUserIp,
    personalNumber,
  };

  const [sendBankIdAuthError, bankIdAuthResponse] = await to(sendBankIdAuthRequest(payload));
  if (sendBankIdAuthError) {
    log.error(
      'Bank Id Auth response error',
      context.awsRequestId,
      'service-bankid-api-auth-001',
      sendBankIdAuthError ?? {}
    );
    return response.failure(new InternalServerError(String(sendBankIdAuthError)));
  }

  return response.success(200, {
    type: 'bankIdAuth',
    attributes: bankIdAuthResponse?.data,
  });
}

async function sendBankIdAuthRequest(payload: BankIdAuthLambdaRequest) {
  const bankIdSSMparams: BankIdSSMParams = await SSMParams;

  const [axiosError, bankIdClient] = await to<AxiosInstance, AxiosError>(
    bankId.client(bankIdSSMparams)
  );
  if (axiosError) {
    throw axiosError;
  }

  const [authError, authResponse] = await to<BankIdAuthResponse, BankIdError>(
    request.call(bankIdClient, 'post', bankId.url(bankIdSSMparams.apiUrl, '/auth'), payload)
  );
  if (authError) {
    throw authError;
  }

  return authResponse;
}
