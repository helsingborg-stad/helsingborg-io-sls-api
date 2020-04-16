import to from 'await-to-js';
import { failure, success } from '../../../libs/response';
import { validateEventBody } from '../../../libs/validateEventBody';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import params from '../../../libs/params';
import config from '../../../config';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read(config.bankId.envsKeyName);

export const main = async event => {
  const bankidSSMParams = await SSMParams;
  const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

  // Helper function for validation of keys in an object
  function validateKeys(obj, keys) {
    for (const key in keys) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  }

  // Not validating personalNumber as it is an optional Parameter
  function validateTokenEventBody(body) {
    let valid, errorStatusCode, errorMessage;
    valid = true;

    if (!validateKeys(body, ['endUserIp'])) {
      valid = false;
      errorStatusCode = 400;
      errorMessage = 'Missing endUserIp';
    }
    if (!validateKeys(body, ['userVisibleData'])) {
      errorStatusCode = 400;
      errorMessage = 'Missing userVisibleData';
    }

    return [valid, errorStatusCode, errorMessage];
  }

  const [validationError, validationEventBody] = await to(
    validateEventBody(event.body, validateTokenEventBody)
  );

  if (!validationEventBody && !validationError.valid) return failure(validationError);

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
