import axios, { AxiosError, Method } from 'axios';
import https from 'https';

interface RequestConfig<T = unknown> {
  method?: Method;
  data?: T;
  headers?: Record<string, unknown>;
  timeout?: number;
}

interface HttpError {
  status: number;
  message: string;
}

type ErrorTransform = (error: HttpError) => HttpError;

const defaultErrorTransform: ErrorTransform = (error: HttpError) => {
  return error;
};

function errorExtractor(e: AxiosError): HttpError {
  return {
    status: e.response?.status ?? 500,
    message: e.response?.statusText ?? e.message,
  };
}

async function request<Response = unknown, Request = unknown>(
  url: string,
  config: RequestConfig<Request> = {},
  errorTransform: ErrorTransform = defaultErrorTransform,
  options: https.AgentOptions = {}
): Promise<Response> {
  try {
    const aggregatedConfig = {
      ...config,
      httpsAgent: new https.Agent({ ...options }),
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };
    return (await axios(url, aggregatedConfig)).data;
  } catch (e) {
    throw errorTransform(errorExtractor(e as AxiosError));
  }
}

export default {
  request,
};
