import { BookingBody, BookingRequest } from './types';

export default (body: BookingRequest): BookingBody => {
  const {
    startTime,
    endTime,
    organizationRequiredAttendees = [],
    externalRequiredAttendees = [],
    optionalAttendees = [],
    subject = '',
    location = '',
    referenceCode = '',
    body: calendarBody = '',
  } = body;

  return {
    requiredAttendees: [...organizationRequiredAttendees, ...externalRequiredAttendees],
    optionalAttendees,
    startTime,
    endTime,
    subject,
    location,
    referenceCode,
    body: calendarBody,
  };
};
