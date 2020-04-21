import { throwError } from '@helsingborg-stad/npm-api-error-handling';

/**
 * @param {obj} body
 * @param {func} callback the callback function must return an array with the following values [isValid::Boolean, errorStatusCode::Integear, errorMesseage::String], where isValid and errorStatusCode are required and erroMessage is optional.
 */
export async function validateEventBody(body, callback) {
  const [isValid, errorStatusCode, errorMessage] = callback(body);
  if (!isValid) {
    throwError(errorStatusCode, errorMessage);
  }
  return body;
}
