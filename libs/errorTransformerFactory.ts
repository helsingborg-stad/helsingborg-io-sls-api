import axios, { AxiosError } from 'axios';
import { AWSError } from 'aws-sdk/lib/error';

interface FactoryError extends Error {
  status: string;
  code?: string;
  detail: string;
}

const defaultStatus = '500';

interface ErrorTransformer<T> {
  transform: (error: T) => FactoryError;
  isErrorType: (error: unknown) => error is T;
}

const axiosErrorTransformer: ErrorTransformer<AxiosError> = {
  transform(error) {
    return {
      status: error?.response?.status.toString() || defaultStatus,
      code: error?.code,
      name: error?.name,
      message: error?.message,
      detail: error.response?.data?.details,
    };
  },

  isErrorType(error: unknown): error is AxiosError {
    return axios.isAxiosError(error);
  },
};

const awsSDKErrorTransformer: ErrorTransformer<AWSError> = {
  transform(error) {
    return {
      status: error.statusCode?.toString() || defaultStatus,
      message: error.message,
      name: error.name,
      code: error.code,
      detail: error.message,
    };
  },

  isErrorType(error: unknown): error is AWSError {
    return ['AccessDeniedException'].includes((error as AWSError)?.code ?? '');
  },
};

const javascriptRuntimeErrorTransformer: ErrorTransformer<TypeError> = {
  transform(error) {
    return {
      status: defaultStatus,
      message: error.message,
      name: error.name,
      code: defaultStatus,
      detail: error.message,
    };
  },

  isErrorType(error: unknown): error is TypeError {
    return error instanceof TypeError;
  },
};

function transformError(error: unknown): Error {
  if (axiosErrorTransformer.isErrorType(error)) {
    return axiosErrorTransformer.transform(error);
  }

  if (awsSDKErrorTransformer.isErrorType(error)) {
    return awsSDKErrorTransformer.transform(error);
  }

  if (javascriptRuntimeErrorTransformer.isErrorType(error)) {
    return javascriptRuntimeErrorTransformer.transform(error);
  }

  throw new Error('Unknown error type');
}

export default transformError;
