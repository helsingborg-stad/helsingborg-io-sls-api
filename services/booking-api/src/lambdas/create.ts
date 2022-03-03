import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import { isTimeslotTaken } from '../helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../helpers/timeSpanHelper';
import getCreateBookingBody from '../helpers/getCreateBookingBody';
import { BookingRequest } from '../helpers/types';

export async function main(event: { body: string }, { awsRequestId }: { awsRequestId: string }) {
  const body: BookingRequest = JSON.parse(event.body);
  const {
    organizationRequiredAttendees = [],
    externalRequiredAttendees = [],
    startTime,
    endTime,
  } = body;

  let message = '';

  if (
    organizationRequiredAttendees.length === 0 ||
    externalRequiredAttendees.length === 0 ||
    !startTime ||
    !endTime
  ) {
    message =
      'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime"';
    log.error(message, awsRequestId, 'service-booking-api-create-001');
    return response.failure({
      status: 403,
      message,
    });
  }

  const systemTime = new Date();

  if (systemTime > new Date(startTime)) {
    return response.failure({
      status: 403,
      message: 'Parameter "startTime" cannot be set to a passed value',
    });
  }

  const getTimeSpansBody = {
    emails: organizationRequiredAttendees,
    startTime,
    endTime,
    meetingDurationMinutes: 0,
  };
  const [getTimeSpansError, timeSpansResult] = await to(booking.getTimeSpans(getTimeSpansBody));
  const timeSpanData = timeSpansResult?.data?.data?.attributes;
  if (getTimeSpansError || !timeSpanData) {
    message = `Error finding timeSpan ${startTime} - ${endTime}`;
    log.error(message, awsRequestId, 'service-booking-api-create-002', getTimeSpansError);
    return response.failure(getTimeSpansError);
  }

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
