import config from './config';

export function buildResponse(statusCode, contentType, body) {
  return {
    statusCode: parseInt(statusCode),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': contentType,
    },
    body,
    isBase64Encoded: false,
  };
}

export function buildResponseRaw(statusCode, rawBody) {
  return buildResponse(statusCode, 'text/plain', rawBody);
}

export function buildResponseJSON(statusCode, body) {
  const jsonApi = {
    jsonapi: {
      version: '1.0',
    },
    data: body,
  };
  return buildResponse(statusCode, 'application/json', JSON.stringify(jsonApi));
}

export function success(statusCode, body) {
  return buildResponseJSON(statusCode, body);
}

export function successRaw(statusCode, rawBody) {
  return buildResponseRaw(statusCode, rawBody);
}

export function failure(error, stackTrace) {
  const errorBody = {
    status: error.status,
    code: error.code,
    title: error.name,
    detail: error.detail,
    message: error.message,
  };

  const addStackTrace = ['dev'].includes(config.stage);
  if (addStackTrace || stackTrace) errorBody.stack = error.stack;

  return buildResponseJSON(error.status, errorBody);
}
