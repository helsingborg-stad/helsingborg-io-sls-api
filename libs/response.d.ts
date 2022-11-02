export function success(
  statusCode: number,
  body: unknown
): {
  statusCode: number;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
    'Content-Type': 'application/json';
  };
  body: string;
  isBase64Encoded: boolean;
};
export function successRaw(
  statusCode: number,
  rawbody: string
): {
  statusCode: number;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
    'Content-Type': 'text/plain';
  };
  body: string;
  isBase64Encoded: boolean;
};
export function failure(
  error: unknown,
  stackTrace?: unknown
): {
  statusCode: number;
  headers: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
    'Content-Type': 'application/json';
  };
  body: string;
  isBase64Encoded: boolean;
};
