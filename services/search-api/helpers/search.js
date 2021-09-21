import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

let outlookSearchEndpoint;
let apiKey;

async function searchBookings(body) {
  if (!outlookSearchEndpoint || !apiKey) {
    await getSsmParameters();
  }

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const url = `${outlookSearchEndpoint}`;
  const [error, response] = await to(request.call(requestClient, 'post', url, body));
  if (error) {
    throw error;
  }

  return response;
}

async function getSsmParameters() {
  const [error, ssmParameters] = await to(params.read(config.search.envsKeyName));

  if (error) {
    throw error;
  }

  outlookSearchEndpoint = ssmParameters.outlookSearchEndpoint;
  apiKey = ssmParameters.apiKey;
}

export { searchBookings };
