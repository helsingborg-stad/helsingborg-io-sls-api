import to from 'await-to-js';

import generateIAMPolicy from '../../../../libs/generateIAMPolicy';
import { verifyToken } from '../../../../libs/token';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';
import log from '../../../../libs/logs';

const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

export async function main(event, context) {
  const { authorizationToken } = event;

  if (!authorizationToken) {
    log.warn(
      'Unauthorized!',
      context.awsRequestId,
      'service-auth-token-authorize-001'
    );

    throw Error('Unauthorized');
  }

  const token = authorizationToken.includes('Bearer')
    ? authorizationToken.substr(authorizationToken.indexOf(' ') + 1)
    : authorizationToken;

  const [getSecretError, secret] = await to(
    secrets.get(
      CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name,
      CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName
    )
  );
  if (getSecretError) {
    log.warn(
      'Unauthorized!',
      context.awsRequestId,
      'service-auth-token-authorize-002'
    );

    throw Error('Unauthorized');
  }

  const [error, decodedToken] = await to(verifyToken(token, secret));
  if (error) {
    log.warn(
      'Unauthorized!',
      context.awsRequestId,
      'service-auth-token-authorize-003'
    );

    throw Error('Unauthorized');
  }

  const IAMPolicy = generateIAMPolicy(
    decodedToken.personalNumber,
    'Allow',
    '*'
  );
  return IAMPolicy;
}
