import to from 'await-to-js';

import { verifyToken } from '../helpers/token';
import generateIAMPolicy from '../helpers/generateIAMPolicy';

export async function main(event) {
  const { authorizationToken, methodArn } = event;
  let isAllowed = true;

  const [error] = await to(verifyToken(authorizationToken));
  if (error) {
    isAllowed = false;
  }

  const effect = isAllowed ? 'Allow' : 'Deny';
  const IAMPolicy = generateIAMPolicy('user', effect, methodArn);

  return IAMPolicy;
}
