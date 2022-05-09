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
  callbackUrl: string;
}

export interface LambdaResponse {
  redirectUrl: string;
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
  readParam: (name: string) => Promise<VismaSSMParams>;
}

export const main = log.wrap(async event => {
  return login(event, {
    readParam: params.read,
  });
});

function validateRequest(data: Event): LambdaRequest {
  let result: LambdaRequest;
  try {
    result = JSON.parse(data?.body);

    if (result?.callbackUrl) {
      return result;
    }
  } catch {
    // Fall through
  }
  throw new BadRequestError();
}

export async function login(event: Event, dependencies: Dependencies) {
  try {
    const data = validateRequest(event);

    const values = await params.read<VismaSSMParams>(config.visma.envsKeyName);

    const result = await https.request<VismaResponse>(
      `${values.baseUrl}/json1.1/Login`,
      {
        method: 'POST',
        params: {
          customerKey: values.customerKey,
          serviceKey: values.serviceKey,
          callbackUrl: data.callbackUrl,
        },
      },
      () => ({
        status: 400,
        message: 'Bad request',
      })
    );
    return response.success(200, {
      redirectUrl: result.redirectUrl,
    });
  } catch (ex) {
    return response.failure(ex);
  }
}
