import axios, { AxiosError, Method } from 'axios';
import https from 'https';
import { AxiosErrorHandler } from './errorHandlers';

interface RequestConfig<T = unknown> {
  method?: Method;
  data?: T;
  headers?: Record<string, unknown>;
  params?: Record<string, unknown>;
  timeout?: number;
}

async function request<Response = unknown, Request = unknown>(
  url: string,
  config: RequestConfig<Request> = {},
  errorTransform: (error: AxiosErrorHandler) => AxiosErrorHandler = (error: AxiosErrorHandler) =>
    error,
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
    throw errorTransform(new AxiosErrorHandler(error as AxiosError));
  }
}

export default {
  request,
};
