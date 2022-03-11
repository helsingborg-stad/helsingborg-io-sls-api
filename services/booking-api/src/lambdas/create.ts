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
      log.error(message, awsRequestId, 'service-booking-api-create-006', searchBookingError);
      return response.failure(createRemoteMeetingError);
    }

    bookingRequest.body += `
      <div style="color:#252424; font-family:'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif">
        <div style="margin-top:24px; margin-bottom:20px">
          <span style="font-size:24px; color:#252424">Microsoft Teams-möte</span>
        </div>
        <div style="margin-bottom:20px">
          <div style="margin-top:0px; margin-bottom:0px; font-weight:bold">
            <span style="font-size:14px; color:#252424">Jobba på datorn eller mobilappen</span>
          </div>
          <a href="${createRemoteMeetingResponse?.data?.data?.attributes.OnlineMeetingUrl}"
            target="_blank" rel="noreferrer noopener"
            style="font-size:14px; font-family:'Segoe UI Semibold','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif; text-decoration:underline; color:#6264a7">
            Klicka här för att ansluta till mötet
          </a>
        </div>
      </div>
    `;
  }

  const createBookingBody = getCreateBookingBody(bookingRequest);

  const [error, createBookingResponse] = await to(booking.create(createBookingBody));
  if (error) {
    message = 'Could not create new booking';
    log.error(message, awsRequestId, 'service-booking-api-create-007', searchBookingError);
    return response.failure(error);
  }

  const bookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId });
}
