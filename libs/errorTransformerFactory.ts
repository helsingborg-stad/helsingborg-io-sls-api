import axios, { AxiosError } from 'axios';

interface ErrorTransformer<T> {
  transform: (error: T) => Error;
}

const axiosErrorTransformer: ErrorTransformer<AxiosError> = {
  transform: error => ({
    status: error?.response?.status.toString() || '500',
    code: error?.code,
    name: error?.name,
    message: error?.message,
    detail: error.response?.data?.details,
  }),
};

const defaultErrorTransformer: ErrorTransformer<Error> = {
  transform: (error: Error) => error,
};

class ErrorTransformerFactory {
  error: unknown;

  constructor(error: unknown) {
    this.error = error;
  }

  transformError() {
    if (axios.isAxiosError(this.error)) {
      return axiosErrorTransformer.transform(this.error);
    }

    if (this.error instanceof Error) {
      return defaultErrorTransformer.transform(this.error);
    }
  }
}

export default ErrorTransformerFactory;
