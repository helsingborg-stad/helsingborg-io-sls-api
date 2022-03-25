import generateIAMPolicy from '../libs/generateIAMPolicy';
import { Token, verifyToken } from '../libs/token';
import config from '../libs/config';
import secrets from '../libs/secrets';
import log from '../libs/logs';
import { extractToken } from '../libs/token';

const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;
export interface LambdaContext {
  getSecret: (secretName: string, secretKeyName: string) => Promise<string>;
  verifyToken: (token: string, secret: string) => Promise<Token>;
}

export interface LambdaEvent {
  authorizationToken?: string;
}
/* istanbul ignore next */
export const main = log.wrap(async event => {
  return await lambda(event, {
    getSecret: secrets.get,
    verifyToken,
  });
});

export async function lambda(event: LambdaEvent, lambdaContext: LambdaContext) {
  const token = extractToken(event.authorizationToken);

  const secret = await lambdaContext.getSecret(
    CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name,
    CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName
  );
  const decodedToken = await lambdaContext.verifyToken(token, secret);

  return generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');
}
