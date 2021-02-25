import * as request from '../../../libs/request';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

export async function getApplicationStatus(hahsedPersonalNumber, ssmParams) {
  const { vadaUrl, xApiKeyToken } = ssmParams;
  const authorizedRequestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaApplicationStatusUrl = `${vadaUrl}/applications/${hahsedPersonalNumber}/status`;

  const [requestError, vadaApplicationStatusResponse] = await to(
    request.call(authorizedRequestClient, 'get', vadaApplicationStatusUrl)
  );

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(requestError.response.status, requestError.response.data.message);
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, requestError.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, requestError.message);
    }
  }

  return vadaApplicationStatusResponse.data;
}

export function isApplicationStatusCorrect(statusList, requiredStatusCodes) {
  if (!Array.isArray(statusList)) {
    return false;
  }
  const filteredStatusList = statusList.filter(status => requiredStatusCodes.includes(status.code));
  return filteredStatusList.length === requiredStatusCodes.length;
}
