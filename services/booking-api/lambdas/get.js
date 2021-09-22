import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const bookingId = event.pathParameters.id;

  const [error, getBookingResponse] = await to(booking.get(bookingId));
  if (error) {
    return response.failure(error);
  }

  const { data } = getBookingResponse.data;
  return response.success(200, data);
}
