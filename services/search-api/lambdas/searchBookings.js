import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import { searchBookings } from '../helpers/search';

export async function main(event) {
  const body = { ...JSON.parse(event.body) };

  const [requestError, getTimeSlotsResponse] = await to(searchBookings(body));
  if (requestError) throwError(requestError.status, requestError.errorMessage);

  const { data } = getTimeSlotsResponse.data;
  return response.success(200, data);
}
