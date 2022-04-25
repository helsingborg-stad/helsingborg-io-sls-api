import axios, { AxiosError, Method } from 'axios';

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

type ErrorProvider = (error: HttpError) => HttpError;

function defaultErrorProvider(e: AxiosError): HttpError {
  return {
    status: e.response?.status ?? 500,
    message: e.response?.statusText ?? e.message,
  };
}

export async function fetch<T = unknown, R = unknown>(
  url: string,
  config: RequestConfig<R> = {},
  customErrorHandler?: ErrorProvider
): Promise<T> {
  try {
    const aggregatedConfig = {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };
    return (await axios(url, aggregatedConfig)).data;
  } catch (e) {
    const result = defaultErrorProvider(e as AxiosError);

    if (!customErrorHandler) {
      throw result;
    }
    throw customErrorHandler(result);
  }
}
