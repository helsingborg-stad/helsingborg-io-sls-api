import to from 'await-to-js';
import snakeCaseKeys from 'snakecase-keys';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import * as response from '../../../libs/response';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read(config.bankId.envsKeyName);

export const main = async event => {
  const { endUserIp, personalNumber } = JSON.parse(event.body);
  const bankIdSSMparams = await SSMParams;

  const payload = {
    endUserIp,
    personalNumber,
  };

  const [error, bankIdAuthResponse] = await to(sendBankIdAuthRequest(bankIdSSMparams, payload));
  if (!bankIdAuthResponse) return response.failure(error);

  return response.success({
    type: 'bankIdAuth',
    attributes: {
      ...snakeCaseKeys(bankIdAuthResponse.data),
    },
  });
};

async function sendBankIdAuthRequest(params, payload) {
  let error, bankIdClientResponse, bankIdAuthResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [error, bankIdAuthResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/auth'), payload)
  );

  if (!bankIdAuthResponse) throwError(error.response.status, error.response.data.details);

  return bankIdAuthResponse;
}
