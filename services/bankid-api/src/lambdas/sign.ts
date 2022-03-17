import to from 'await-to-js';

import { AxiosInstance, AxiosError } from 'axios';
import { throwError, InternalServerError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';

import * as request from '../libs/request';
import * as response from '../libs/response';

import { validateEventBody } from '../libs/validateEventBody';
import { validateKeys } from '../libs/validateKeys';

import * as bankId from '../helpers/bankId';
import { BankIdError, BankIdSSMParams } from 'helpers/types';

const SSMParams = params.read(config.bankId.envsKeyName);
const valid = true;

interface BankIdSignLambdaRequest {
  endUserIp: string;
  personalNumber: string;
  userVisibleData?: string;
}

interface BankIdSignResponse {
  data?: {
    orderRef: string;
    autoStartToken: string;
    qrStartToken: string;
    qrStartSecret: string;
  };
}

export async function main(event: { body: string }, context: { awsRequestId: string }) {
  const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

  const [validationError] = await to(validateEventBody(event.body, validateTokenEventBody));
  if (validationError && !valid) {
    log.error(
      'Validation error',
      context.awsRequestId,
      'service-bankid-api-sign-001',
      validationError
    );
    return response.failure(new InternalServerError(String(validationError)));
  }

  const payload: BankIdSignLambdaRequest = {
    endUserIp,
    personalNumber,
    userVisibleData: userVisibleData
      ? Buffer.from(userVisibleData).toString('base64') // eslint-disable-line no-undef
      : undefined,
  };

  const [bankIdSignError, bankIdSignResponse] = await to(sendBankIdSignRequest(payload));
  if (bankIdSignError) {
    log.error(
      'Bank Id Sign response error',
      context.awsRequestId,
      'service-bankid-api-sign-002',
      bankIdSignError ?? {}
    );
    return response.failure(new InternalServerError(String(bankIdSignError)));
  }

  return response.success(200, {
    type: 'bankIdSign',
    attributes: bankIdSignResponse?.data,
  });
}

function validateTokenEventBody(body: string): [boolean, number, string | undefined] {
  const isValid = validateKeys(JSON.parse(body), ['endUserIp', 'userVisibleData']);
  if (isValid) {
    return [true, 200, undefined];
  }

  return [false, 400, 'Missing JSON body parameter'];
}

async function sendBankIdSignRequest(payload: BankIdSignLambdaRequest) {
  const bankIdSSMparams: BankIdSSMParams = await SSMParams;

  const [axiosError, bankIdClient] = await to<AxiosInstance, AxiosError>(
    bankId.client(bankIdSSMparams)
  );
  if (axiosError) {
    throw axiosError;
  }

  const [signError, signResponse] = await to<BankIdSignResponse, BankIdError>(
    request.call(bankIdClient, 'post', bankId.url(bankIdSSMparams.apiUrl, '/sign'), payload)
  );
  if (signError) {
    throwError(signError?.response.status, signError?.response.data?.details ?? '');
  }

  return signResponse;
}
