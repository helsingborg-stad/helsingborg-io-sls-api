import https from '../libs/https';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import * as response from '../libs/response';
import { parseJson } from '../libs/json';
import { AWSProxyEvent } from '../libs/aws-sdk';

export interface LambdaRequest {
  callbackUrl: string;
}

export interface LambdaResponse {
  redirectUrl: string;
}

export interface VismaResponse {
  redirectUrl: string;
  sessionId: string;
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
  httpsRequest: typeof https.request;
  createResponse: typeof response.success;
}

/* istanbul ignore next */
export const main = log.wrap(async event => {
  return login(event, {
    readParams: params.read,
    httpsRequest: https.request,
    createResponse: response.success,
  });
});

export async function login(event: AWSProxyEvent, dependencies: Dependencies) {
  try {
    /**
     * ======================================================
     * Parse input data
     * ======================================================
     */
    const data = parseJson<LambdaRequest>(event.body);

    /**
     * ======================================================
     * Read parameters from AWS System manager
     * ======================================================
     * These parameters contains the secret keys and the URL of the
     * Visma service and is needed to authorize the calling account.
     */
    const values = await dependencies.readParams<VismaSSMParams>(config.visma.envsKeyName);

    /**
     * ======================================================
     * Perform login with Visma Rest API
     * ======================================================
     * This request will prepare a session that the user need
     * to authenticate towards.
     */
    const result = await dependencies.httpsRequest<VismaResponse>(
      `${values.baseUrl}/json1.1/Login`,
      {
        method: 'POST',
        params: {
          customerKey: values.customerKey,
          serviceKey: values.serviceKey,
          callbackUrl: data.callbackUrl,
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
     * Prepare successful response
     * ======================================================
     * The response is the session unique redirect URL a client
     * will follow to display the Visma login page.
     */
    return dependencies.createResponse(200, {
      redirectUrl: result.redirectUrl,
    });
  } catch {
    /**
     * ======================================================
     * Report error back to client
     * ======================================================
     * Any errors will be returned as Http status 400 to not
     * reveal any specifics about the issue occured.
     */
    return response.failure({
      status: 400,
      message: 'Bad request',
    });
  }
}
