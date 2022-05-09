import https from '../libs/https';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import * as response from '../libs/response';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import secrets from '../libs/secrets';
import { signToken, getExpireDate } from '../libs/token';

const SESSION_TOKEN_EXPIRES_IN_MINUTES = 20;
const CONFIG_AUTH_SECRETS_ACCESS_TOKEN = config.auth.secrets.accessToken;

interface Event {
  body: string;
}

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
  dependency: (value: string) => string;
}

export const main = log.wrap(async event => {
  return session(event, {
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

export async function session(event: Event, dependencies: Dependencies) {
  try {
    const data = validateRequest(event);

    const [values, secret] = await Promise.all([
      params.read<VismaSSMParams>(config.visma.envsKeyName),
      secrets.get(CONFIG_AUTH_SECRETS_ACCESS_TOKEN.name, CONFIG_AUTH_SECRETS_ACCESS_TOKEN.keyName),
    ]);

    const result = await https.request<VismaResponse>(
      `${values.baseUrl}/json1.1/GetSession`,
      {
        method: 'POST',
        params: {
          customerKey: values.customerKey,
          serviceKey: values.serviceKey,
          sessionId: data.sessionId,
        },
      },
      () => ({
        status: 401,
        message: 'Authentication failed',
      })
    );

    if (result.errorObject) {
      throw {
        status: 404,
        message: result.errorObject.message,
      };
    }
    const timestamp = getExpireDate(SESSION_TOKEN_EXPIRES_IN_MINUTES);

    const sessionToken = await signToken(
      {
        sessionId: result.sessionId,
        serialNumber: result.userAttributes.serialNumber,
      },
      secret,
      timestamp
    );

    return response.success(200, {
      timestamp,
      sessionToken,
    } as LambdaResponse);
  } catch (error) {
    return response.failure(error);
  }
}
