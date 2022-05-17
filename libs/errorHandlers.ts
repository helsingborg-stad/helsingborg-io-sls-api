import { AxiosError } from 'axios';

export interface GenericError {
  status: number;
  message: string;
}

export class BaseErrorHandler extends Error implements GenericError {
  public status: number;
  constructor(error: GenericError) {
    super(error.message);
    this.status = error.status ?? 502;
    this.name = 'BaseErrorHandler';
  }
}

export class AxiosErrorHandler extends BaseErrorHandler {
  constructor(error: AxiosError) {
    super({
      status: error.response?.status ?? 502,
      message: error.response?.statusText ?? error.message,
    });
    this.name = 'AxiosErrorHandler';
  }
}
