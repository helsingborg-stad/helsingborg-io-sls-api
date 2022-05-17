import https from '../libs/https';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import * as response from '../libs/response';
import secrets from '../libs/secrets';
import { signToken, getExpireDate } from '../libs/token';
import { AWSProxyEvent } from '../libs/aws-sdk';
import { parseJson } from '../libs/json';

const SESSION_TOKEN_EXPIRES_IN_MINUTES = 20;
const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

export interface LambdaRequest {
  sessionId: string;
}
export interface LambdaResponse {
  timestamp: number;
  sessionToken: string;
}

export interface VismaResponse {
  sessionId: string;
  userAttributes: {
    serialNumber: string;
  };
  errorObject?: {
    code: string;
    message: string;
  };
}

export interface VismaSSMParams {
  customerKey: string;
  serviceKey: string;
  baseUrl: string;
}

export interface Dependencies {
  readParams: typeof params.read;
  readSecrets: typeof secrets.get;
  httpsRequest: typeof https.request;
  createResponse: typeof response.success;
  getExpireDate: typeof getExpireDate;
  signToken: typeof signToken;
}

/* istanbul ignore next */
export const main = log.wrap(async event => {
  return session(event, {
    readParams: params.read,
    readSecrets: secrets.get,
    httpsRequest: https.request,
    createResponse: response.success,
    getExpireDate,
    signToken,
  });
});

export async function session(event: AWSProxyEvent, dependencies: Dependencies) {
  try {
    /**
     * ======================================================
     * Parse input data
     * ======================================================
     */
    const data = parseJson<LambdaRequest>(event.body);

    /**
     * ======================================================
     * Read parameters from AWS System manager and Secrets
     * ======================================================
     * These parameters contains the secret keys and the URL of the
     * Visma service and is needed to authorize the calling account.
     * The value used for JWT token generation is stored in Secrets.
     */
    const [values, secret] = await Promise.all([
      dependencies.readParams<VismaSSMParams>(config.visma.envsKeyName),
      dependencies.readSecrets(
        CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name,
        CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName
      ),
    ]);

    /**
     * ======================================================
     * Perform GetSession with Visma Rest API
     * ======================================================
     * This request will return the session created from a
     * succesful login.
     */
    const result = await dependencies.httpsRequest<VismaResponse>(
      `${values.baseUrl}/json1.1/GetSession`,
      {
        method: 'POST',
        params: {
          customerKey: values.customerKey,
          serviceKey: values.serviceKey,
          sessionId: data.sessionId,
        },
      }
    );
    /**
     * ======================================================
     * Handle response errors from Visma
     * ======================================================
     * Certain errors are embedded in the 200 response
     */
    if (result.errorObject) {
      throw Error();
    }
    /**
     * ======================================================
     * Generate a JWT-Token
     * ======================================================
     * The token can be used to call API's or otherwise verify
     * the identity of the user
     */
    const timestamp = dependencies.getExpireDate(SESSION_TOKEN_EXPIRES_IN_MINUTES);

    const sessionToken = await dependencies.signToken(
      {
        sessionId: result.sessionId,
        serialNumber: result.userAttributes.serialNumber,
      },
      secret,
      timestamp
    );

    /**
     * ======================================================
     * Prepare successful response
     * ======================================================
     * The response contains a timestamp that has the same expirytime
     * as the embedded JWT token to be used for cookie invalidation
     */
    return dependencies.createResponse(200, {
      timestamp,
      sessionToken,
    } as LambdaResponse);
  } catch (error) {
    /**
     * ======================================================
     * Report error back to client
     * ======================================================
     */
    return response.failure({
      status: 401,
      message: 'Authentication failed',
    });
  }
}
