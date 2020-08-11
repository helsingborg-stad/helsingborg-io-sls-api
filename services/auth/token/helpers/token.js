import jwt from 'jsonwebtoken';
import to from 'await-to-js';
import config from '../../../../config';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import secrets from '../../../../libs/secrets';

const secretKey = secrets.get(config.token.secret.name, config.token.secret.keyName);

export async function signToken(jsonToSign) {
  const [error, secret] = await to(secretKey);
  if (error) throwError(error.code, error.message);

  // Add expiration time to JWT token, 15 min.
  // The format is in seconds since Jan 1, 1970, not milliseconds, to match the default iat format of JWT.
  jsonToSign.exp = parseInt(Date.now() / 1000) + 15 * 60;

  const token = jwt.sign(jsonToSign, secret);
  return token;
}

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
