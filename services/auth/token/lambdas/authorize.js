import to from 'await-to-js';

import generateIAMPolicy from '../helpers/generateIAMPolicy';
import { verifyToken } from '../../../../libs/token';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import { logWarn } from '../../../../libs/logs';

const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

export async function main(event, context) {
  const { authorizationToken } = event;

  if (!authorizationToken) {
    logWarn('Unauthorized!', context.awsRequestId, 'service-auth-token-authorize-001');

    throwError(401, 'Unauthorized');
  }

  const token = authorizationToken.includes('Bearer')
    ? authorizationToken.substr(authorizationToken.indexOf(' ') + 1)
    : authorizationToken;

  const [getSecretError, secret] = await to(
    secrets.get(CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name, CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName)
  );
  if (getSecretError) {
    logWarn('Unauthorized!', context.awsRequestId, 'service-auth-token-authorize-002');

    throwError(401, 'Unauthorized');
  }

  const [error, decodedToken] = await to(verifyToken(token, secret));
  if (error) {
    logWarn('Unauthorized!', context.awsRequestId, 'service-auth-token-authorize-003');
    // By throwing this error AWS returns a 401 response with the message unauthorized
    throwError(401, 'Unauthorized');
  }

  const IAMPolicy = generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');
  return IAMPolicy;
}
