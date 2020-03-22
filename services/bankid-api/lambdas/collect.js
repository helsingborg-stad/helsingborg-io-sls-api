import to from 'await-to-js';
import snakeCaseKeys from 'snakecase-keys';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import params from '../../../libs/params';
import * as response from '../../../libs/response';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read('/bankidEnvs/dev');

export const main = async event => {
  const { orderRef } = JSON.parse(event.body);
  const bankidSSMParams = await SSMParams;

  const payload = { orderRef };

  const [error, bankIdCollectResponse] = await to(
    sendBankIdCollectRequest(bankidSSMParams, payload)
  );
  if (!bankIdCollectResponse) return response.failure(error);

  return response.success({
    type: 'bankIdCollect',
    attributes: {
      ...snakeCaseKeys(bankIdCollectResponse.data),
    },
  });
};

async function sendBankIdCollectRequest(params, payload) {
  let error, bankIdClientResponse, bankIdCollectResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [error, bankIdCollectResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/collect'), payload)
  );

  if (!bankIdCollectResponse) throwError(error.status);

  return bankIdCollectResponse;
}
