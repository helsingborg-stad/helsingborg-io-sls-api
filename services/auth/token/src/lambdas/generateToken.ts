import to from 'await-to-js';
import config from '../libs/config';
import secrets from '../libs/secrets';
import * as response from '../libs/response';
import { signToken, verifyToken, getExpireDate } from '../libs/token';
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

interface AuthLambdaRequest {
  grant_type: string;
  refresh_token?: string;
  code?: string;
}

interface JWTToken {
  personalNumber: string;
}

interface SDKError {
  code: string;
  message: string;
}
export async function main(event: { body: string }, context: { awsRequestId: string }) {
  const [parseJsonError, parsedJson] = await to<AuthLambdaRequest | undefined>(
    parseJson(event.body)
  );

  if (parseJsonError) {
    log.warn(
      'JSON Parse error',
      context.awsRequestId,
      'service-auth-token-generateToken-001',
      parseJsonError
    );

    return response.failure(parseJsonError);
  }

  const [validationError, validatedEventBody] = await to(
    validateEventBody(
      parsedJson ?? {
        grant_type: '',
      },
      tokenValidationSchema
    )
  );

  if (validationError) {
    log.warn(
      'Validation error',
      context.awsRequestId,
      'service-auth-token-generateToken-002',
      validationError
    );

    return response.failure(validationError);
  }

  const grantTypeValues = getGrantTypeValues(validatedEventBody);

  const [validateTokenError, decodedGrantToken] = await to(
    validateToken(grantTypeValues?.secretsConfig, grantTypeValues?.token ?? '')
  );

  if (validateTokenError) {
    log.warn(
      'Validate token error',
      context.awsRequestId,
      'service-auth-token-generateToken-003',
      validateTokenError
    );

    return response.failure(validateTokenError);
  }

  const personalNumber = decodedGrantToken?.personalNumber ?? '';

  const [getAccessTokenError, accessToken] = await to(
    generateToken(CONFIG_AUTH_SECRETS.accessToken, personalNumber, ACCESS_TOKEN_EXPIRES_IN_MINUTES)
  );

  if (getAccessTokenError) {
    log.warn(
      'Get access token error',
      context.awsRequestId,
      'service-auth-token-generateToken-004',
      getAccessTokenError
    );

    return response.failure(getAccessTokenError);
  }

  const [getRefreshTokenError, refreshToken] = await to(
    generateToken(
      CONFIG_AUTH_SECRETS.refreshToken,
      personalNumber,
      REFRESH_TOKEN_EXPIRES_IN_MINUTES
    )
  );
  if (getRefreshTokenError) {
    log.warn(
      'Get refresh token error',
      context.awsRequestId,
      'service-auth-token-generateToken-004',
      getRefreshTokenError
    );

    return response.failure(getRefreshTokenError);
  }

  const successResponsePayload = {
    type: 'authorizationToken',
    attributes: {
      accessToken,
      refreshToken,
    },
  };
  return response.success(200, successResponsePayload);
}

async function validateEventBody(eventBody: AuthLambdaRequest, schema: Joi.ObjectSchema) {
  const { error, value } = schema.validate(eventBody, { abortEarly: false });
  if (error) {
    const matchDoubleQuote = /"/g;
    const singleQuote = "'";
    throwError(400, error.message.replace(matchDoubleQuote, singleQuote));
  }

  return value;
}

async function parseJson(eventBody: string): Promise<AuthLambdaRequest | undefined> {
  try {
    const parsedJsonData = JSON.parse(eventBody);
    return parsedJsonData as AuthLambdaRequest;
  } catch (error) {
    throwError(400, (error as SDKError).message);
  }
}

function getGrantTypeValues(eventBody: AuthLambdaRequest) {
  if (eventBody.grant_type === 'authorization_code') {
    return {
      secretsConfig: CONFIG_AUTH_SECRETS.authorizationCode,
      token: eventBody.code,
    };
  }

  if (eventBody.grant_type === 'refresh_token') {
    return {
      secretsConfig: CONFIG_AUTH_SECRETS.refreshToken,
      token: eventBody.refresh_token,
    };
  }
}

async function generateToken(
  secretConfig: SecretsConfig,
  personalNumber: string,
  expiresInMinutes: number
) {
  const [getSecretError, secret] = await to<string, SDKError>(
    secrets.get(secretConfig.name, secretConfig.keyName)
  );
  if (getSecretError) {
    throwError(Number(getSecretError.code), getSecretError.message);
  }

  const [signTokenError, token] = await to(
    signToken({ personalNumber }, secret ?? '', getExpireDate(expiresInMinutes))
  );
  if (signTokenError) {
    throwError(401, signTokenError.message);
  }

  return token;
}

async function validateToken(secretConfig: SecretsConfig, token: string): Promise<JWTToken> {
  const [getSecretError, secret] = await to<string, SDKError>(
    secrets.get(secretConfig.name, secretConfig.keyName)
  );
  if (getSecretError) {
    throwError(Number(getSecretError.code), getSecretError.message);
  }
  const [verifyTokenError, verifiedToken] = await to<JWTToken, SDKError>(
    verifyToken(token, secret ?? '')
  );
  if (verifyTokenError) {
    throwError(401, verifyTokenError.message);
  }

  return (
    verifiedToken ?? {
      personalNumber: '',
    }
  );
}
