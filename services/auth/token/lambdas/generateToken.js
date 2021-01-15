import to from 'await-to-js';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';
import * as response from '../../../../libs/response';
import { signToken, verifyToken } from '../../../../libs/token';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import tokenValidationSchema from '../helpers/schema';

const CONFIG_AUTH_SECRETS = config.auth.secrets;
const ACCESS_TOKEN_EXPIRES_IN_MINUTES = 20;
const REFRESH_TOKEN_EXPIRES_IN_MINUTES = 30;

export const main = async event => {
  const [parseJsonError, parsedJson] = await to(parseJson(event.body));
  if (parseJsonError) {
    return response.failure(parseJsonError);
  }

  const [validationError, validatedEventBody] = await to(
    validateEventBody(parsedJson, tokenValidationSchema)
  );
  if (validationError) {
    return response.failure(validationError);
  }

  const grantTypeValues = getGrantTypeValues(validatedEventBody);

  const [validateTokenError, decodedGrantToken] = await to(
    validateToken(grantTypeValues.secretsConfig, grantTypeValues.token)
  );
  if (validateTokenError) {
    return response.failure(validateTokenError);
  }

  const personalNumber = decodedGrantToken.personalNumber;

  const [getAccessTokenError, accessToken] = await to(
    generateToken(CONFIG_AUTH_SECRETS.accessToken, personalNumber, ACCESS_TOKEN_EXPIRES_IN_MINUTES)
  );
  if (getAccessTokenError) {
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
};

async function validateEventBody(eventBody, schema) {
  const { error, value } = schema.validate(eventBody, { abortEarly: false });
  if (error) {
    const matchDoubleQuote = /"/g;
    const singleQuote = "'";
    throwError(400, error.message.replace(matchDoubleQuote, singleQuote));
  }

  return value;
}

async function parseJson(eventBody) {
  try {
    const parsedJsonData = JSON.parse(eventBody);
    return parsedJsonData;
  } catch (error) {
    throwError(400, error.message);
  }
}

function getGrantTypeValues(eventBody) {
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

async function generateToken(secretConfig, personalNumber, expiresInMinutes) {
  const [getSecretError, secret] = await to(secrets.get(secretConfig.name, secretConfig.keyName));
  if (getSecretError) {
    throwError(getSecretError.code, getSecretError.message);
  }

  const [signTokenError, token] = await to(signToken({ personalNumber }, secret, expiresInMinutes));
  if (signTokenError) {
    throwError(401, signTokenError.message);
  }

  return token;
}

async function validateToken(secretConfig, token) {
  const [getSecretError, secret] = await to(secrets.get(secretConfig.name, secretConfig.keyName));
  if (getSecretError) {
    throwError(getSecretError.code, getSecretError.message);
  }
  const [verifyTokenError, verifiedToken] = await to(verifyToken(token, secret));
  if (verifyTokenError) {
    throwError(401, verifyTokenError.message);
  }

  return verifiedToken;
}
