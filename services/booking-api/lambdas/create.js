import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const body = { ...JSON.parse(event.body) };

  const [error, createBookingResponse] = await to(booking.create(body));
  if (error) {
    throwError(error);
  }

  const { data } = createBookingResponse.data;
  return response.success(200, data);
}
