import jwt from 'jsonwebtoken';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import secrets from '../../../../libs/secrets';

const SECRET_KEY = secrets.get('dev/token/generation', 'TokenGeneratorSecret');

export async function signToken(jsonToSign) {
  const secret = await SECRET_KEY;
  const token = jwt.sign(jsonToSign, secret);
  return token;
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (error, decoded) => {
    if (error) {
      throwError(401, error.message);
    }
    return decoded;
  });
}
