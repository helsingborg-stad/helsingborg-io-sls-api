import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import { isTimeslotTaken } from '../helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../helpers/timeSpanHelper';
import getCreateBookingBody from '../helpers/getCreateBookingBody';
import { BookingRequest } from '../helpers/types';
import isDefined from '../helpers/isDefined';
import strings from '../helpers/strings';
import getMeetingHtmlBody from '../helpers/getMeetingHtmlBody';

export async function main(event: { body: string }, { awsRequestId }: { awsRequestId: string }) {
  const bookingRequest: BookingRequest = JSON.parse(event.body);
  const {
    organizationRequiredAttendees = [],
    externalRequiredAttendees = [],
    startTime,
    endTime,
    remoteMeeting,
    subject,
  } = bookingRequest;

  let message = '';
  let remoteMeetingLink: string | undefined;

  if (
    organizationRequiredAttendees.length === 0 ||
    externalRequiredAttendees.length === 0 ||
    !startTime ||
    !endTime ||
    !isDefined(subject)
  ) {
    message =
      'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';
    log.error(message, awsRequestId, 'service-booking-api-create-001');
    return response.failure({
      status: 400,
      message,
      detail: strings.booking.create.missingRequiredParamter,
    });
  }

  const systemTime = new Date();

  if (systemTime > new Date(startTime)) {
    return response.failure({
      status: 400,
      message: 'Parameter "startTime" cannot be set to a passed value',
      detail: strings.booking.create.startTimePassed,
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
    return response.failure({ status: 400, message });
  }

  const timeSpansExist = Object.values(timeSpanData).flat().length > 0;

  const timeValid = areAllAttendeesAvailable({ startTime, endTime }, timeSpanData);

  if (!timeSpansExist || !timeValid) {
    message = 'No timeslot exists in the given interval';
    log.error(message, awsRequestId, 'service-booking-api-create-003');
    return response.failure({
      status: 400,
      message,
      detail: strings.booking.create.timespanNotExisting,
    });
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
    return response.failure({
      status: 400,
      message,
      detail: strings.booking.create.timeslotNotAvailable,
    });
  }

  if (remoteMeeting) {
    const [createRemoteMeetingError, createRemoteMeetingResponse] = await to(
      booking.createRemoteMeeting({
        attendees: [...organizationRequiredAttendees, ...externalRequiredAttendees],
        endTime,
        startTime,
        subject,
      })
    );

    if (createRemoteMeetingError) {
      message = 'Could not create remote meeting link';
      log.error(message, awsRequestId, 'service-booking-api-create-006', createRemoteMeetingError);
      return response.failure(createRemoteMeetingError);
    }

    remoteMeetingLink = createRemoteMeetingResponse?.data?.data?.attributes.OnlineMeetingUrl;
  }

  const bookingHtmlBody = getMeetingHtmlBody(bookingRequest.formData, remoteMeetingLink);
  const createBookingBody = getCreateBookingBody(bookingRequest, bookingHtmlBody);

  const [error, createBookingResponse] = await to(booking.create(createBookingBody));
  if (error) {
    message = 'Could not create new booking';
    log.error(message, awsRequestId, 'service-booking-api-create-007', searchBookingError);
    return response.failure(error);
  }

  const bookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId });
}
