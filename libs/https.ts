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

function errorExtractor(error: AxiosError): HttpError {
  return {
    status: error.response?.status ?? 500,
    message: error.response?.statusText ?? error.message,
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
  } catch (error) {
    throw errorTransform(errorExtractor(error as AxiosError));
  }
}

export default {
  request,
};
