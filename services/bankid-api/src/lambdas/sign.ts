import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../libs/config';
import params from '../libs/params';
import * as request from '../libs/request';
import { failure, success } from '../libs/response';
import { validateEventBody } from '../libs/validateEventBody';
import { validateKeys } from '../libs/validateKeys';
import * as bankId from '../helpers/bankId';
import log from '../libs/logs';
import { BankIdError, BankIdParams } from 'helpers/types';

const SSMParams = params.read(config.bankId.envsKeyName);
let valid = true;

interface BankIdSignLambdaRequest {
  endUserIp: string;
  personalNumber: string;
  userVisibleData?: string;
}

interface BankIdSignResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export const main = async (event: { body: string }, context: { awsRequestId: string }) => {
  const bankidSSMParams = await SSMParams;
  const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

  const [validationError] = await to(validateEventBody(event.body, validateTokenEventBody));

  if (validationError && !valid) {
    log.error(
      'Validation error',
      context.awsRequestId,
      'service-bankid-api-sign-001',
      validationError
    );

    return failure(validationError);
  }

  const payload: BankIdSignLambdaRequest = {
    endUserIp,
    personalNumber,
    userVisibleData: userVisibleData
      ? Buffer.from(userVisibleData).toString('base64') // eslint-disable-line no-undef
      : undefined,
  };

  const [error, bankIdSignResponse] = await to<BankIdSignResponse | undefined, BankIdError>(
    sendBankIdSignRequest(bankidSSMParams, payload)
  );

  if (!bankIdSignResponse) {
    log.error(
      'Bank Id Sign response error',
      context.awsRequestId,
      'service-bankid-api-sign-002',
      error ?? {}
    );

    return failure(error);
  }

  return success(200, {
    type: 'bankIdSign',
  });
};
// Not validating personalNumber as it is an optional Parameter
function validateTokenEventBody(body: string) {
  let errorStatusCode, errorMessage;
  valid = true;

  if (!validateKeys(JSON.parse(body), ['endUserIp', 'userVisibleData'])) {
    valid = false;
    errorStatusCode = 400;
    errorMessage = 'Missing JSON body parameter';
  }

  return [valid, errorStatusCode, errorMessage];
}

async function sendBankIdSignRequest(
  params: BankIdParams,
  payload: BankIdSignLambdaRequest
): Promise<BankIdSignResponse | undefined> {
  const [, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  const [error, bankIdSignResponse] = await to<BankIdSignResponse, BankIdError>(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/sign'), payload)
  );

  if (!bankIdSignResponse) throwError(error?.response.status, error?.response.data?.details);
  return bankIdSignResponse;
}
