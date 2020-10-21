import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import params from '../../../libs/params';
import * as request from '../../../libs/request';
import * as response from '../../../libs/response';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read(config.bankId.envsKeyName);

export const main = async event => {
  const { orderRef } = JSON.parse(event.body);
  const bankidSSMParams = await SSMParams;

  const payload = { orderRef };

  const [error, bankIdCollectResponse] = await to(
    sendBankIdCollectRequest(bankidSSMParams, payload)
  );

  if (!bankIdCollectResponse) return response.failure(error);

  if (bankIdCollectResponse.data.status === 'complete') {
    await putEvent(
      bankIdCollectResponse.data.completionData,
      'BankIdCollectComplete',
      'bankId.collect'
    );
  }

  const attributes = bankIdCollectResponse.data ? bankIdCollectResponse.data : {};

  return response.success(200, {
    type: 'bankIdCollect',
    attributes,
  });
};

async function sendBankIdCollectRequest(params, payload) {
  let error, bankIdClientResponse, bankIdCollectResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [error, bankIdCollectResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/collect'), payload)
  );
  if (!bankIdCollectResponse) {
    if (error.response.data.details === 'No such order') {
      throwError(404, error.response.data.details);
    }
    throwError(error.response.status, error.response.data.details);
  }

  return bankIdCollectResponse;
}
