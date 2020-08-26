import jwt from 'jsonwebtoken';
import to from 'await-to-js';
import config from '../config';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import secrets from './secrets';

const secretKey = secrets.get(config.token.secret.name, config.token.secret.keyName);

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

/**
 * Asynchronously sign a given payload into a JSON Web Token.
 * @param {obj} jsonToSign the payload of the json web token.
 * @param {string} secretKey
 */
export async function signToken(jsonToSign) {
  const [error, secret] = await to(secretKey);
  if (error) throwError(error.code, error.message);

  // Add expiration time to JWT token, 15 min.
  // The format is in seconds since Jan 1, 1970, not milliseconds, to match the default iat format of JWT.
  jsonToSign.exp = parseInt(Date.now() / 1000) + 15 * 60;

  const token = jwt.sign(jsonToSign, secret);
  return token;
}

/**
 * Asynchronously verify given token using a secret or a public key to get a decoded JSON Web Token
 * @param {string} token a json web token
 */
export async function verifyToken(token) {
  const [error, secret] = await to(secretKey);
  if (error) throwError(500);

  return jwt.verify(token, secret, (error, decoded) => {
    if (error) {
      throwError(401, error.message);
    }
    return decoded;
  });
}
