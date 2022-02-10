export function success(
  statusCode: number,
  body: any
): {
  statusCode: any;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
  };
  body: string;
};
export function failure(
  error: any,
  stackTrace?: any
): {
  statusCode: any;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
  };
  body: string;
};
export function buildResponse(
  statusCode: any,
  body: any
): {
  statusCode: any;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
  };
  body: string;
};
