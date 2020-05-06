import to from 'await-to-js';
import { failure, success } from '../../../libs/response';
import { validateEventBody } from '../../../libs/validateEventBody';
import { validateKeys } from '../../../libs/validateKeys';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import params from '../../../libs/params';
import config from '../../../config';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read(config.bankId.envsKeyName);
let valid = true;

export const main = async event => {
  const bankidSSMParams = await SSMParams;
  const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

  const [validationError, validationEventBody] = await to(
    validateEventBody(event.body, validateTokenEventBody)
  );

  if (validationError && !valid) return failure(validationError);

  const payload = {
    endUserIp,
    personalNumber,
    userVisibleData: userVisibleData
      ? Buffer.from(userVisibleData).toString('base64') // eslint-disable-line no-undef
      : undefined,
  };

  const [error, bankIdSignResponse] = await to(sendBankIdSignRequest(bankidSSMParams, payload));
  if (!bankIdSignResponse) return failure(error);
  return success({
    type: 'bankIdSign',
    attributes: {
      ...bankIdSignResponse.data,
    },
  });
};
// Not validating personalNumber as it is an optional Parameter
function validateTokenEventBody(body) {
  let errorStatusCode, errorMessage;
  valid = true;

  if (!validateKeys(JSON.parse(body), ['endUserIp', 'userVisibleData'])) {
    valid = false;
    errorStatusCode = 400;
    errorMessage = 'Missing JSON body parameter';
  }

  return [valid, errorStatusCode, errorMessage];
}

async function sendBankIdSignRequest(params, payload) {
  let error, bankIdClientResponse, bankIdSignResponse;
  [error, bankIdClientResponse] = await to(bankId.client(params));

  if (!bankIdClientResponse) throwError(error.response.status, error.response.data.details);

  [error, bankIdSignResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/sign'), payload)
  );

  if (!bankIdSignResponse) throwError(error.response.status, error.response.data.details);
  return bankIdSignResponse;
}
