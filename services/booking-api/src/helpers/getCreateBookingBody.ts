import { BookingBody } from './types';

export default (body: BookingBody) => {
  const {
    requiredAttendees,
    startTime,
    endTime,
    optionalAttendees = [],
    subject = '',
    location = '',
    referenceCode = '',
    body: calendarBody = '',
  } = body;

  return {
    requiredAttendees,
    optionalAttendees,
    startTime,
    endTime,
    subject,
    location,
    referenceCode,
    body: calendarBody,
  };
};
