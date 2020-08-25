import jwt from 'jsonwebtoken';

/**
 * Takes an http event with an jwt authorization header, and returns the decoded info from it. Does not check if the token is valid, that should be handled by an authorizer.
 * @param {*} httpEvent the event passed to the lambda
 */
export function decodeToken(httpEvent) {
  const authorizationValue = httpEvent.headers.Authorization;

  const token = authorizationValue.includes('Bearer')
    ? authorizationValue.substr(authorizationValue.indexOf(' ') + 1)
    : authorizationValue;

  const decodedToken = jwt.decode(token);
  return decodedToken;
}
