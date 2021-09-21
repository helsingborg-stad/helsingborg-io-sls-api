import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const bookingId = event.pathParameters.id;

  let body = { bookingId };
  const [cancelError] = await to(booking.cancel(body));
  if (cancelError) {
    throwError(cancelError);
  }

  body = { ...JSON.parse(event.body) };
  const [createError, createBookingResponse] = await to(booking.create(body));
  if (createError) {
    throwError(createError);
  }

  const { data } = createBookingResponse.data;
  return response.success(200, data);
}
