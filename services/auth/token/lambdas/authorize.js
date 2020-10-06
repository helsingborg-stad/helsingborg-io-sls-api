import to from 'await-to-js';

import generateIAMPolicy from '../helpers/generateIAMPolicy';
import { verifyToken } from '../../../../libs/token';

export async function main(event) {
  const { authorizationToken } = event;

  const token = authorizationToken.includes('Bearer')
    ? authorizationToken.substr(authorizationToken.indexOf(' ') + 1)
    : authorizationToken;

  const [error, decodedToken] = await to(verifyToken(token));
  if (error) {
    // By thorwing this error AWS returns a 401 response with the message unauthorized
    throw Error('Unauthorized');
  }

  const IAMPolicy = generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');
  return IAMPolicy;
}
