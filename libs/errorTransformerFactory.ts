import type { AxiosError } from 'axios';
import axios from 'axios';
import type { AWSError } from 'aws-sdk/lib/error';

export interface LambdaError extends Error {
  status: string;
  code?: number;
  detail: string;
}

interface FactoryErrorConstructorParameters {
  status: string;
  code?: number;
  detail: string;
  message: string;
  name: string;
}

export class LambdaError extends Error implements LambdaError {
  status: string;
  code?: number;
  detail: string;

  constructor({ status, code, detail, message, name }: FactoryErrorConstructorParameters) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.name = name;

    // See https://github.com/microsoft/TypeScript-wiki/blob/a425a2d1b26e81d9989b0f51499591181f93e956/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, LambdaError.prototype);
  }
}

const defaultStatus = 500;

function getStatusCode(input?: string): number {
  const statusCode = input ? parseInt(input) : defaultStatus;
  return isNaN(statusCode) ? defaultStatus : statusCode;
}

interface ErrorTransformer<T> {
  transform: (error: T) => LambdaError;
  isErrorType: (error: unknown) => error is T;
}

const axiosErrorTransformer: ErrorTransformer<AxiosError> = {
  transform(error) {
    return new LambdaError({
      status: getStatusCode(error?.response?.status.toString()).toString(),
      code: getStatusCode(error?.code),
      name: error?.name,
      message: error?.message,
      detail: error.response?.data?.details,
    });
  },

  isErrorType(error: unknown): error is AxiosError {
    return axios.isAxiosError(error);
  },
};

const awsSDKErrorTransformer: ErrorTransformer<AWSError> = {
  transform(error) {
    return new LambdaError({
      status: getStatusCode(error.statusCode?.toString()).toString(),
      message: error.message,
      name: error.name,
      code: getStatusCode(error.code),
      detail: error.message,
    });
  },

  isErrorType(error: unknown): error is AWSError {
    return ['AccessDeniedException'].includes((error as AWSError)?.code ?? '');
  },
};

const javascriptRuntimeErrorTransformer: ErrorTransformer<Error> = {
  transform(error) {
    return new LambdaError({
      status: getStatusCode().toString(),
      message: error.message,
      name: error.name,
      code: getStatusCode(),
      detail: error.message,
    });
  },

  isErrorType(error: unknown): error is Error {
    return error instanceof Error;
  },
};

function transformError(error: unknown): LambdaError {
  if (axiosErrorTransformer.isErrorType(error)) {
    return axiosErrorTransformer.transform(error);
  }

  if (awsSDKErrorTransformer.isErrorType(error)) {
    return awsSDKErrorTransformer.transform(error);
  }

  if (javascriptRuntimeErrorTransformer.isErrorType(error)) {
    return javascriptRuntimeErrorTransformer.transform(error);
  }

  const asError = error as Error;
  return javascriptRuntimeErrorTransformer.transform({
    ...asError,
    message: `(unknown error) ${asError?.message}`,
  });
}

export default transformError;
