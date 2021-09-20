import to from 'await-to-js';

import * as request from '../../../libs/request';

export async function makeBookingRequest(url, apikey, body) {
  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apikey }
  );

  const [error, response] = await to(request.call(requestClient, 'post', url, body));
  if (error) throw error;

  return response;
}
