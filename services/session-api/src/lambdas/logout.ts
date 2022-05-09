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
  redirectUrl: string;
  sessionId: string;
}

export interface VismaSSMParams {
  customerKey: string;
  serviceKey: string;
  baseUrl: string;
}

export interface Dependencies {
  dependency: (value: string) => string;
}

export const main = log.wrap(async event => {
  return logout(event, {
    dependency: value => value,
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

    const values: VismaSSMParams = await params.read(config.visma.envsKeyName);

    const result = await https.request<VismaResponse>(
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
    return response.success(200, result);
  } catch (ex) {
    return response.failure(ex);
  }
}
