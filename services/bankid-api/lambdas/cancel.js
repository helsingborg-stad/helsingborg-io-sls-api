import { snakeCaseKeys } from 'snakecase-keys';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import params from '../../../libs/params';
import * as response from '../../../libs/response';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read('/bankidEnvs/dev');

export const main = async event => {
  const {orderRef} = JSON.parse(event.body)

  const bankidSSMParams = await SSMParams;

  const payload = {
    orderRef
  };

  const [error, bankIdCancelResponse] = await to(sendBankIdCancelRequest(bankidSSMParams, payload));
  if(!bankIdCancelResponse) response.failure(error);

  return {
    type: 'bankidCancel',
    attributes: {
      ...snakeCaseKeys(bankIdCancelResponse.data)
    }
  };
};

async function sendBankIdCancelRequest(params, payload) {
  let err, bankIdClientResponse, bankIdCancelResponse;

  [err, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [err, bankIdCancelResponse] = await to(
    request.call(
      bankIdCancelResponse,
      'post',
      bankId.url(params.apiUrl, '/auth'),
      payload
    )
  );

  if (!bankIdCancelResponse) throwError(err.status);

  return bankIdCancelResponse;
};
