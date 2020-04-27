import jwt from 'jsonwebtoken';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// TODO: Retrive and use real SECRET_KEY from AWS;
const SECRET_KEY = 'secretKeey';

export function signToken(jsonToSign) {
  const token = jwt.sign(jsonToSign, SECRET_KEY);
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
