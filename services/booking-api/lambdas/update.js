import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';
import getCreateBookingBody from '../helpers/getCreateBookingBody';

export async function main(event) {
  const bookingId = decodeURIComponent(event.pathParameters.id);

  const body = JSON.parse(event.body);
  const { requiredAttendees = [], startTime, endTime } = body;

  if (requiredAttendees.length === 0 || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message:
        'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"',
    });
  }

  const [cancelError] = await to(booking.cancel(bookingId));
  if (cancelError) {
    return response.failure(cancelError);
  }

  const createBookingBody = getCreateBookingBody(body);
  const [createError, createBookingResponse] = await to(
    booking.create(createBookingBody)
  );
  if (createError) {
    return response.failure(createError);
  }

  const newBookingId = createBookingResponse.data.data.attributes.BookingId;

  return response.success(200, { bookingId: newBookingId });
}
