import to from 'await-to-js';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';
import * as response from '../../../../libs/response';
import { signToken, verifyToken } from '../../../../libs/token';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

const authSecrets = config.auth.secrets;

export const main = async event => {
  const [queryStringParamsError, queryStringParams] = await to(
    validateAutorizationQueryStringParams(event.queryStringParameters)
  );
  if (queryStringParamsError) return response.failure(queryStringParamsError);

  const grantTypeDetails = getGrantTypeDetails(queryStringParams);

  const [validateTokenError, decodedGrantToken] = await to(
    validateToken(grantTypeDetails.secretsConfig, grantTypeDetails.token)
  );
  if (validateTokenError) {
    return response.failure(validateTokenError);
  }

  const personalNumber = decodedGrantToken.personalNumber;

  const accessTokenExpiresInMinutes = 20;
  const [getAccessTokenError, accessToken] = await to(
    generateToken(authSecrets.accessToken, personalNumber, accessTokenExpiresInMinutes)
  );
  if (getAccessTokenError) {
    return response.failure(getAccessTokenError);
  }

  const refreshTokenExpiresInMinutes = 30;
  const [getRefreshTokenError, refreshToken] = await to(
    generateToken(authSecrets.refreshToken, personalNumber, refreshTokenExpiresInMinutes)
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

function getGrantTypeDetails(queryStringParams) {
  if (queryStringParams.grant_type === 'authorization_code') {
    return {
      secretsConfig: authSecrets.authorizationCode,
      token: queryStringParams.code,
    };
  }

  if (queryStringParams.grant_type === 'refresh_token') {
    return {
      secretsConfig: authSecrets.refreshToken,
      token: queryStringParams.refresh_token,
    };
  }
}

async function generateToken(secretConfig, personalNumber, expiresInSeconds) {
  const [getSecretError, secret] = await to(secrets.get(secretConfig.name, secretConfig.keyName));
  if (getSecretError) {
    throwError(getSecretError.code, getSecretError.message);
  }

  const [signTokenError, token] = await to(signToken({ personalNumber }, secret, expiresInSeconds));
  if (signTokenError) throwError(401, signTokenError.message);

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

/**
 * Function for validating query paramaters for authorization
 * @param {object} params an object consiting of key/value pairs for query string parameters.
 */
async function validateAutorizationQueryStringParams(params) {
  const validGrantTypes = ['refresh_token', 'authorization_code'];

  if (params === null || !params.grant_type) {
    throwError(400, 'Missing request param grant_type');
  }
  if (!validGrantTypes.includes(params.grant_type)) {
    throwError(400, 'Incorrect grant_type is passed in request params');
  }
  if (params.grant_type === 'authorization_code' && !params.code) {
    throwError(
      400,
      'The grant type authorization_code requires the param code to be passed in request params'
    );
  }

  return params;
}
