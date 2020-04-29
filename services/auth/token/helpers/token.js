import jwt from 'jsonwebtoken';
import to from 'await-to-js';
import config from '../../../../config';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import secrets from '../../../../libs/secrets';

const SECRET_KEY = secrets.get(config.token.secret.name, config.token.secret.keyName);

export async function signToken(jsonToSign) {
  const [error, secret] = await to(SECRET_KEY);
  if (error) throwError(500);

  const token = jwt.sign(jsonToSign, secret);
  return token;
}

export async function verifyToken(token) {
  const [error, secret] = await to(SECRET_KEY);
  if (error) throwError(500);

  return jwt.verify(token, secret, (error, decoded) => {
    if (error) {
      throwError(401, error.message);
    }
    return decoded;
  });
}
