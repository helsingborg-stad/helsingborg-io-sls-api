import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';
import getCreateBookingBody from '../helpers/getCreateBookingBody';

export async function main(event) {
  const body = JSON.parse(event.body);
  const { requiredAttendees = [], startTime, endTime } = body;

  if (requiredAttendees.length === 0 || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message:
        'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"',
    });
  }

  const searchBookingBody = { startTime, endTime };
  const [searchBookingError, searchResponse] = await to(
    booking.search(searchBookingBody)
  );
  if (searchBookingError) {
    return response.failure(searchBookingError);
  }

  const timeslotTaken = searchResponse?.data?.data?.attributes.length > 0;
  if (timeslotTaken) {
    return response.failure({
      message: 'Timeslot not available for booking',
      status: 500,
    });
  }

  const createBookingBody = getCreateBookingBody(body);
  const [error, createBookingResponse] = await to(
    booking.create(createBookingBody)
  );
  if (error) {
    return response.failure(error);
  }

  const bookingId = createBookingResponse.data.data.attributes.BookingId;

  return response.success(200, { bookingId });
}
