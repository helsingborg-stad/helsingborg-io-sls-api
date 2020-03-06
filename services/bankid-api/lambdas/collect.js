import * as response from '../../../libs/response';
import params from "../../../libs/params";
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';
import { to } from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

const SSMParams = params.read("/bankidEnvs/dev");

export const main = async event => {
  const { orderRef } = JSON.parse(event.body);
  const bankidSSMParams = await SSMParams;

  const payload = { orderRef };

  [error, bankIdResponse] = await to(sendBankIdCollectRequest(bankidSSMParams, payload))
  if(!bankIdResponse) return response.failure()

  return response.success({
    type: 'bankIdCollect',
     attributes: {
       ...snakeCaseKeys(bankIdResponse.data),
      },
  })
};

function sendBankIdCollectRequest (params, payload) {
  let error, bankIdClientResponse, bankIdCollectResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if(!bankIdClientResponse) throwError(error)

  [error, bankIdCollectResponse] = await to(request.call(
      bankIdClient,
      'post',
      bankId.url(params.apiUrl, '/collect'),
      payload,
  ));
  if(!bankIdCollectResponse) throwError(error)

  return bankIdCollectResponse;
}
