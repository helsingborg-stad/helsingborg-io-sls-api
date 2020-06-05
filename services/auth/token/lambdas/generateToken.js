import to from 'await-to-js';
import * as response from '../../../../libs/response';
import { signToken } from '../helpers/token';
import { validateEventBody } from '../../../../libs/validateEventBody';

export const main = async event => {
  const jsonBody = JSON.parse(event.body);

  const [error, validatedEventBody] = await to(
    validateEventBody(jsonBody, validateTokenRequestBody)
  );
  if (error) return response.failure(error);

  const [errorSignToken, token] = await to(signToken(validatedEventBody));
  if (errorSignToken) return response.failure(errorSignToken);

  const successResponsePayload = {
    type: 'authorizationToken',
    attributes: {
      token,
    },
  };
  return response.success(successResponsePayload);
};

/**
 * Function for running validation on the request body.
 * @param {obj} json
 */
function validateTokenRequestBody(json) {
  if (!validateKeys(json, ['personalNumber'])) {
    return [false, 400, 'personalNumber is missing in the json body'];
  }

  if (!isSwedishSocialSecurityNumber(json.personalNumber)) {
    return [
      false,
      400,
      'The value of the key personalNumber should be a valid SSN(Swedish Social Security Number)',
    ];
  }

  return [true];
}

/**
 * Check if a string is a valid SSN(Swedish Social Security Number)
 * @param {string} ssn
 */
function isSwedishSocialSecurityNumber(ssn) {
  if (/^(19|20)?(\d{6}(-|\s|T)\d{4}|(?!19|20)\d{10})$/.test(ssn)) {
    return true;
  }
  return false;
}

/**
 * Check if keys exsists in object
 * @param {object} obj
 * @param {array} keys
 */
function validateKeys(obj, keys) {
  for (const i in keys) {
    if (!(keys[i] in obj)) {
      return false;
    }
  }
  return true;
}
