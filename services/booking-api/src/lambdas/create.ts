import { TimeSpanData } from './../helpers/types';
import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import getTimeSpans from '../helpers/getTimeSpans';
import { isTimeslotTaken } from '../helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../helpers/timeSpanHelper';
import getCreateBookingBody from '../helpers/getCreateBookingBody';

export async function main(event: { body: string }, { awsRequestId }: { awsRequestId: string }) {
  const body = JSON.parse(event.body);
  const { requiredAttendees = [], startTime, endTime } = body;

  let message = '';

  if (requiredAttendees.length === 0 || !startTime || !endTime) {
    message =
      'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"';
    log.error(message, awsRequestId, 'service-booking-api-create-001');
    return response.failure({
      status: 403,
      message,
    });
  }

  const getTimeSpanBody = {
    emails: requiredAttendees,
    startTime,
    endTime,
    meetingDurationMinutes: 0,
  };
  const [getTimeSpanError, getTimeSpanResponse] = await to(getTimeSpans(getTimeSpanBody));

  if (getTimeSpanError) {
    message = `Error finding timeSpan ${startTime} - ${endTime}`;
    log.error(message, awsRequestId, 'service-booking-api-create-002', getTimeSpanError);
    return response.failure(getTimeSpanError);
  }

  const timeSpanData = getTimeSpanResponse as TimeSpanData;
  const timeSpansExist = Object.values(timeSpanData).flat().length > 0;

  const timeValid = areAllAttendeesAvailable({ startTime, endTime }, timeSpanData);

  if (!timeSpansExist || !timeValid) {
    message = 'No timeslot exists in the given interval';
    log.error(message, awsRequestId, 'service-booking-api-create-003');
    return response.failure({ message, status: 403 });
  }

  const searchBookingBody = { startTime, endTime };
  const [searchBookingError, searchResponse] = await to(booking.search(searchBookingBody));

  if (searchBookingError) {
    message = `Error finding bookings between ${startTime} - ${endTime}`;
    log.error(message, awsRequestId, 'service-booking-api-create-004', searchBookingError);
    return response.failure(searchBookingError);
  }

  const bookingExist = searchResponse?.data?.data?.attributes?.length ?? 0 > 0;
  const timeslotTaken = isTimeslotTaken(searchResponse?.data?.data?.attributes ?? []);

  if (bookingExist && timeslotTaken) {
    message = 'Timeslot not available for booking';
    log.error(message, awsRequestId, 'service-booking-api-create-005', searchBookingError);
    return response.failure({ message, status: 403 });
  }

  const createBookingBody = getCreateBookingBody(body);
  const [error, createBookingResponse] = await to(booking.create(createBookingBody));
  if (error) {
    message = 'Could not create new booking';
    log.error(message, awsRequestId, 'service-booking-api-create-006', searchBookingError);
    return response.failure(error);
  }

  const bookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId });
}
