import https from '../libs/https';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import * as response from '../libs/response';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

interface Event {
  body: string;
}

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

function validateRequest(data: Event): LambdaRequest {
  let result: LambdaRequest;
  try {
    result = JSON.parse(data?.body);

    if (result?.sessionId) {
      return result;
    }
  } catch {
    // Fall through
  }
  throw new BadRequestError();
}

export async function logout(event: Event, dependencies: Dependencies) {
  try {
    const data = validateRequest(event);

    const values = await dependencies.readParams<VismaSSMParams>(config.visma.envsKeyName);

    const result = await dependencies.httpsRequest<VismaResponse>(
      `${values.baseUrl}/json1.1/Logout`,
      {
        method: 'POST',
        params: {
          customerKey: values.customerKey,
          serviceKey: values.serviceKey,
          sessionId: data.sessionId,
        },
      },
      () => ({
        status: 404,
        message: 'Session not found',
      })
    );
    return dependencies.createResponse(200, {
      sessionDeleted: result.sessiondeleted,
    });
  } catch (error) {
    return response.failure(error);
  }
}
