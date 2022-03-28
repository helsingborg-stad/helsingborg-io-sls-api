import config from '../libs/config';
import secrets from '../libs/secrets';
import * as response from '../libs/response';
import { signToken, Token, verifyToken } from '../libs/token';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import tokenValidationSchema from '../helpers/schema';
import log from '../libs/logs';
import Joi from 'joi';

const CONFIG_AUTH_SECRETS = config.auth.secrets;
const ACCESS_TOKEN_EXPIRES_IN_MINUTES = 60;
const REFRESH_TOKEN_EXPIRES_IN_MINUTES = 24 * 60; // Hours * 60 minutes

interface SecretsConfig {
  name: string;
  keyName: string;
}
interface GrantValueTypes {
  secretsConfig: SecretsConfig;
  token: string;
}
interface AuthLambdaRequest {
  grant_type: string;
  refresh_token: string;
  code: string;
}
export interface LambdaContext {
  getSecret: (secretName: string, secretKeyName: string) => Promise<string>;
  verifyToken: (token: string, secret: string) => Promise<Token>;
  signToken: (jsonToSign: Token, secret: string, expireTimeInMinutes: number) => Promise<string>;
}

/* istanbul ignore next */
export const main = log.wrap(async (event: { body: string }) => {
  return await lambda(event, {
    getSecret: secrets.get,
    verifyToken,
    signToken,
  });
});

export async function lambda(event: { body: string }, lambdaContext: LambdaContext) {
  try {
    const parsedJson = parseJson(event.body);
    const validatedEventBody = validateEventBody(parsedJson, tokenValidationSchema);
    const grantTypeValues = getGrantTypeValues(validatedEventBody);

    const decodedGrantToken = await validateToken(
      grantTypeValues.secretsConfig,
      grantTypeValues.token,
      lambdaContext
    );

    const accessToken = await generateToken(
      CONFIG_AUTH_SECRETS.accessToken,
      decodedGrantToken.personalNumber,
      ACCESS_TOKEN_EXPIRES_IN_MINUTES,
      lambdaContext
    );

    const refreshToken = await generateToken(
      CONFIG_AUTH_SECRETS.refreshToken,
      decodedGrantToken.personalNumber,
      REFRESH_TOKEN_EXPIRES_IN_MINUTES,
      lambdaContext
    );

    return response.success(200, {
      type: 'authorizationToken',
      attributes: {
        accessToken,
        refreshToken,
      },
    });
  } catch (ex) {
    return response.failure(ex);
  }
}

function validateEventBody(
  eventBody: AuthLambdaRequest,
  schema: Joi.ObjectSchema<AuthLambdaRequest>
) {
  const { error, value } = schema.validate(eventBody, { abortEarly: false });
  if (value && !error) {
    return value;
  }
  throwError(400, 'Invalid JSON body format');
}

function parseJson(eventBody: string): AuthLambdaRequest {
  try {
    return JSON.parse(eventBody);
  } catch {
    throwError(400, 'Missing JSON body');
  }
}

function getGrantTypeValues(eventBody: AuthLambdaRequest): GrantValueTypes {
  if (eventBody.grant_type === 'refresh_token') {
    return {
      secretsConfig: CONFIG_AUTH_SECRETS.refreshToken,
      token: eventBody.refresh_token,
    };
  }
  return {
    secretsConfig: CONFIG_AUTH_SECRETS.authorizationCode,
    token: eventBody.code,
  };
}

async function generateToken(
  secretConfig: SecretsConfig,
  personalNumber: string,
  expiresInMinutes: number,
  lambdaContext: LambdaContext
) {
  const secret = await lambdaContext.getSecret(secretConfig.name, secretConfig.keyName);

  try {
    return await lambdaContext.signToken({ personalNumber }, secret, expiresInMinutes);
  } catch {
    throwError(401, 'Failed to sign token');
  }
}

async function validateToken(
  secretConfig: SecretsConfig,
  token: string,
  lambdaContext: LambdaContext
): Promise<Token> {
  const secret = await lambdaContext.getSecret(secretConfig.name, secretConfig.keyName);

  try {
    return await lambdaContext.verifyToken(token, secret);
  } catch {
    throwError(401, 'Failed to verify token');
  }
}
