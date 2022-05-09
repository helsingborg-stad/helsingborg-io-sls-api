import config from './config';

export function success(statusCode = 200, body) {
  return buildResponse(statusCode, body);
}

export function failure(error, stackTrace) {
  const errorBody = {
    code: error.status,
    title: error.name,
    detail: error.detail,
    message: error.message,
  };

  const addStackTrace = ['dev'].includes(config.stage);
  if (addStackTrace || stackTrace) errorBody.stack = error.stack;

  return buildResponse(errorBody.code, errorBody);
}

export function buildResponse(statusCode, body) {
  const jsonApi = {
    jsonapi: {
      version: '1.0',
    },
    data: body,
  };
  return {
    statusCode: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(jsonApi),
  };
}
