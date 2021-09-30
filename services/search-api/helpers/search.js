import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

async function searchBookings(body) {
  const { outlookSearchEndpoint, apiKey } = await getSsmParameters();

  if (!outlookSearchEndpoint || !apiKey) {
    await getSsmParameters();
  }

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const url = outlookSearchEndpoint;
  const [error, response] = await to(request.call(requestClient, 'post', url, body));
  if (error) {
    throw error;
  }

  return response;
}

async function getSsmParameters() {
  const [error, response] = await to(params.read(config.search.envsKeyName));
  if (error) {
    throwError(500);
  }

  return response;
}

export { searchBookings };
