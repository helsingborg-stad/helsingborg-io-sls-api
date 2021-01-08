import to from 'await-to-js';
import config from '../../../../config';
import secrets from '../../../../libs/secrets';
import * as response from '../../../../libs/response';
import { signToken, verifyToken } from '../../../../libs/token';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

export const main = async event => {
  const [queryStringParamsError, queryStringParams] = await to(
    validateAutorizationQueryStringParams(event.queryStringParameters)
  );
  if (queryStringParamsError) return response.failure(queryStringParamsError);

  let tokens = {};

  if (queryStringParams.grant_type === 'authorization_code') {
    const [authorizationCodeError, authorizationCodeData] = await to(
      validateAuthorizationCode(queryStringParams.code)
    );
    if (authorizationCodeError) {
      return response.failure(authorizationCodeError);
    }

    const payload = {
      personalNumber: authorizationCodeData.personalNumber,
    };

    const [errorSignToken, authTokens] = await to(generateAuthTokens(payload));
    if (errorSignToken) {
      return response.failure(errorSignToken);
    }

    tokens = authTokens;
  }

  const successResponsePayload = {
    type: 'authorizationToken',
    attributes: {
      ...tokens,
    },
  };
  return response.success(200, successResponsePayload);
};

async function generateAuthTokens(payload) {
  const [getSecretError, secret] = await to(
    secrets.get(config.token.secret.name, config.token.secret.keyName)
  );
  if (getSecretError) {
    throwError(getSecretError.code, getSecretError.message);
  }

  const [signAccessTokenError, signedAccessToken] = await to(signToken(payload, secret, 20));
  if (signAccessTokenError) throwError(401, signAccessTokenError.message);

  const [signRefreshTokenError, signedRefreshToken] = await to(signToken({}, secret, 30));
  if (signRefreshTokenError) throwError(401, signRefreshTokenError.message);

  return {
    accessToken: signedAccessToken,
    refreshToken: signedRefreshToken,
  };
}

/**
 * Function for validating an authorization code that is issued.
 * @param {string} code a json web token.
 */
async function validateAuthorizationCode(code) {
  const [getSecretError, secret] = await to(
    secrets.get(config.authorization_code.secret.name, config.authorization_code.secret.keyName)
  );
  if (getSecretError) {
    throwError(getSecretError.code, getSecretError.message);
  }

  const [authorizationCodeError, authorizationCodeData] = await to(verifyToken(code, secret));
  if (authorizationCodeError) {
    throwError(authorizationCodeError.code, authorizationCodeError.message);
  }
  return authorizationCodeData;
}

/**
 * Function for validating query paramaters for authorization
 * @param {object} params an object consiting of key/value pairs for query string parameters.
 */
async function validateAutorizationQueryStringParams(params) {
  const valid_grant_types = ['refresh_token', 'authorization_code'];

  if (params === null || !params.grant_type) {
    throwError(400, 'Missing request param grant_type');
  }
  if (!valid_grant_types.includes(params.grant_type)) {
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
