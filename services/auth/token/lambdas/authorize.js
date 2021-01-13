import to from 'await-to-js';

import generateIAMPolicy from '../helpers/generateIAMPolicy';
import { verifyToken } from '../../../../libs/token';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';

const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

export async function main(event) {
  const { authorizationToken } = event;

  const token = authorizationToken.includes('Bearer')
    ? authorizationToken.substr(authorizationToken.indexOf(' ') + 1)
    : authorizationToken;

  const [getSecretError, secret] = await to(
    secrets.get(CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name, CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName)
  );
  if (getSecretError) {
    throw Error('Unauthorized');
  }

  const [error, decodedToken] = await to(verifyToken(token, secret));
  if (error) {
    // By thorwing this error AWS returns a 401 response with the message unauthorized
    throw Error('Unauthorized');
  }

  const IAMPolicy = generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');
  return IAMPolicy;
}
