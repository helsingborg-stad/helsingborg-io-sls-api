import to from 'await-to-js';
import { verifyToken } from '../helpers/token';
import generateIAMPolicy from '../helpers/generateIAMPolicy';

export async function main(event) {
  const { authorizationToken } = event;
  const [error, decodedToken] = await to(verifyToken(authorizationToken));
  if (error) {
    // By thorwing this error AWS returns a 401 response with the message unauthorized
    throw Error('Unauthorized');
  }

  const IAMPolicy = generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');

  return IAMPolicy;
}
