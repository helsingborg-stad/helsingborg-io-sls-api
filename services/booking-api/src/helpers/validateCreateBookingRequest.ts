import to from 'await-to-js';
import booking from './booking';
import isDefined from './isDefined';
import strings from './strings';
import { areAllAttendeesAvailable } from './timeSpanHelper';
import { BookingRequest } from './types';

export async function validateCreateBookingRequest(bookingRequest: BookingRequest) {
  const {
    organizationRequiredAttendees = [],
    externalRequiredAttendees = [],
    startTime,
    endTime,
    subject,
  } = bookingRequest;

  if (
    organizationRequiredAttendees.length === 0 ||
    externalRequiredAttendees.length === 0 ||
    !startTime ||
    !endTime ||
    !isDefined(subject)
  ) {
    const message =
      'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';
    throw {
      message,
      detail: strings.booking.create.missingRequiredParamter,
    };
  }

  const systemTime = new Date();

  if (systemTime > new Date(bookingRequest.startTime)) {
    throw {
      message: 'Parameter "startTime" cannot be set to a passed value',
      detail: strings.booking.create.startTimePassed,
    };
  }

  const getTimeSpansBody = {
    emails: bookingRequest.organizationRequiredAttendees,
    startTime,
    endTime,
    meetingDurationMinutes: 0,
  };

  const [getTimeSpansError, timeSpansResult] = await to(booking.getTimeSpans(getTimeSpansBody));
  const timeSpanData = timeSpansResult?.data?.data?.attributes;

  if (getTimeSpansError || !timeSpanData) {
    const message = `Error finding timeSpan ${startTime} - ${endTime}`;
    throw { message };
  }

  const timeSpansExist = Object.values(timeSpanData).flat().length > 0;

  const timeValid = areAllAttendeesAvailable({ startTime, endTime }, timeSpanData);

  if (!timeSpansExist || !timeValid) {
    const message = 'No timeslot exists in the given interval';
    throw { message, detail: strings.booking.create.timespanNotExisting };
  }
}
