/* eslint-disable @typescript-eslint/no-explicit-any */
export function requestClient(
  options: obj,
  headers?: obj,
  timeout?: number,
  contentType?: string
): import('axios').AxiosInstance;
export function call(client: any, method: any, url: any, payload: any): any;
