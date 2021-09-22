import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const bookingId = event.pathParameters.id;
  const body = { bookingId };

  const [error] = await to(booking.cancel(body));
  if (error) {
    return response.failure(error);
  }

  return response.success(200, body);
}
