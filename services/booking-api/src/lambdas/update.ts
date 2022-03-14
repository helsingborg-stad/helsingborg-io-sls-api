import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import { isTimeslotTaken } from '../helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../helpers/timeSpanHelper';
import getCreateBookingBody from '../helpers/getCreateBookingBody';
import { BookingRequest } from '../helpers/types';
import getMeetingHtmlBody from '../helpers/getMeetingHtmlBody';

export async function main(
  event: { pathParameters: Record<string, string>; body: string },
  { awsRequestId }: { awsRequestId: string }
) {
  const bookingId = decodeURIComponent(event.pathParameters.id);

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
    log.error(message, awsRequestId, 'service-booking-api-update-001');
    return response.failure({ status: 403, message });
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
    log.error(message, awsRequestId, 'service-booking-api-update-002', getTimeSpansError);
    return response.failure(getTimeSpansError);
  }

  const timeSpansExist = Object.values(timeSpanData).flat().length > 0;
  const timeValid = areAllAttendeesAvailable({ startTime, endTime }, timeSpanData);

  if (!timeSpansExist || !timeValid) {
    message = 'No timeslot exists in the given interval';
    log.error(message, awsRequestId, 'service-booking-api-update-003', getTimeSpansError);
    return response.failure({ message, status: 403 });
  }

  const searchBookingBody = { startTime, endTime };
  const [searchBookingError, searchResponse] = await to(booking.search(searchBookingBody));

  if (searchBookingError) {
    message = `Error finding bookings between ${startTime} - ${endTime}`;
    log.error(message, awsRequestId, 'service-booking-api-update-004', searchBookingError);
    return response.failure({ message, status: 500 });
  }

  const bookingExist = searchResponse?.data?.data?.attributes?.length ?? 0 > 0;
  const timeslotTaken = isTimeslotTaken(searchResponse?.data?.data?.attributes ?? []);

  if (bookingExist && timeslotTaken) {
    message = 'Timeslot not available for booking';
    log.error(message, awsRequestId, 'service-booking-api-update-005');
    return response.failure({ message, status: 403 });
  }

  const [cancelError] = await to(booking.cancel(bookingId));
  if (cancelError) {
    message = 'Timeslot cancellation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-006', cancelError);
    return response.failure({ message, status: 500 });
  }

  const bookingHtmlBody = getMeetingHtmlBody(body.formData);
  const createBookingBody = getCreateBookingBody(body, bookingHtmlBody);

  const [createError, createBookingResponse] = await to(booking.create(createBookingBody));
  if (createError) {
    message = 'Timeslot creation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-007', createError);
    return response.failure({ message, status: 500 });
  }

  const newBookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId: newBookingId });
}
