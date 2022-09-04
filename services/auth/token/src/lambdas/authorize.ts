import generateIAMPolicy from '../libs/generateIAMPolicy';
import { Token, verifyToken, extractToken } from '../libs/token';
import config from '../libs/config';
import secrets from '../libs/secrets';
import log from '../libs/logs';

const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

export interface LambdaRequest {
  authorizationToken?: string;
}

export interface Dependencies {
  getSecret: (secretName: string, secretKeyName: string) => Promise<string>;
  verifyToken: (token: string, secret: string) => Promise<Token>;
}


export async function authorizer(input: LambdaRequest, dependencies: Dependencies) {
  const token = extractToken(input.authorizationToken);

  const secret = await dependencies.getSecret(
    CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name,
    CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName
  );
  const decodedToken = await dependencies.verifyToken(token, secret);

  return generateIAMPolicy(decodedToken.personalNumber, 'Allow', '*');
}

export const main = log.wrap(event => {
  return authorizer(event, {
    getSecret: secrets.get,
    verifyToken,
  });
});
