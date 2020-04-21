import to from 'await-to-js';
import jwt from 'jsonwebtoken';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

const SECRET_KEY = 'secretKeey';

export const signToken = jsonToSign => {
  const token = jwt.sign(jsonToSign, SECRET_KEY);
  return token;
};

export const verifyToken = async token =>
  jwt.verify(token, SECRET_KEY, (error, decoded) => {
    if (error) {
      throwError(401, error.message);
    }
    return decoded;
  });
