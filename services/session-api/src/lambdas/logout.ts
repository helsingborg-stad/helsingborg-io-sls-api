import https from '../libs/https';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import * as response from '../libs/response';
import { parseJson } from '../libs/json';
import { AWSProxyEvent } from '../libs/aws-sdk';

export interface LambdaRequest {
  sessionId: string;
}

export interface VismaResponse {
  sessiondeleted: string;
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
  return logout(event, {
    readParams: params.read,
    httpsRequest: https.request,
    createResponse: response.success,
  });
});

export async function logout(event: AWSProxyEvent, dependencies: Dependencies) {
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
     * Perform logout with Visma Rest API
     * ======================================================
     * This request will prepare a session that the user need
     * to authenticate towards.
     */
    const result = await dependencies.httpsRequest<VismaResponse>(
      `${values.baseUrl}/json1.1/Logout`,
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
     * Prepare successful response
     * ======================================================
     */
    return dependencies.createResponse(200, {
      sessionDeleted: result.sessiondeleted,
    });
  } catch {
    /**
     * ======================================================
     * Report error back to client
     * ======================================================
     * Any errors will be returned as Http status 404 to not
     * reveal any specifics about the issue occured.
     */
    return response.failure({
      status: 404,
      message: 'Session not found',
    });
  }
}
