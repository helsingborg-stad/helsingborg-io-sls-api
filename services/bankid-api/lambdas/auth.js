import * as response from '../../../libs/response';
import to from 'await-to-js';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import params from '../../../libs/params';

const SSMParams = params.read('/bankidEnvs/dev');

export const main = async event => {
  const bankIdSSMparams = await SSMParams;

  const { endUserIp, personalNumber } = JSON.parse(event.body);

  const payload = {
    endUserIp,
    personalNumber,
  };

  const [error, bankIdResponse] = await to(requestBankIdAuth(payload, bankIdSSMparams));
  if (!bankIdResponse) return response.failure(error);

  const { orderRef, autoStartToken } = bankIdResponse.data;

  return response.success({
    type: 'bankIdAuth',
    attributes: {
      order_ref: orderRef,
      auto_start_token: autoStartToken,
    },
  });
};

async function requestBankIdAuth(payload, params) {
  let err, bankIdClient, bankIdAuth;

  [err, bankIdClient] = await to(bankId.client(params));
  if (!bankIdClient) throwError(503);

  [err, bankIdAuth] = await to(
    request.call(bankIdClient, 'post', bankId.url(params.apiUrl, '/auth'), payload)
  );

  if (!bankIdAuth) throwError(err.status);

  return bankIdAuth;
}
