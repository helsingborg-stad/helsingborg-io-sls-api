import { CreateBookingRequestBody, BookingRequest } from './types';

export default (
  bookingRequest: BookingRequest,
  bookingHtmlBody: string
): CreateBookingRequestBody => {
  const {
    startTime,
    endTime,
    organizationRequiredAttendees,
    externalRequiredAttendees,
    subject,
    optionalAttendees = [],
    location = '',
    referenceCode = '',
  } = bookingRequest;
  return {
    requiredAttendees: [...organizationRequiredAttendees, ...externalRequiredAttendees],
    optionalAttendees,
    startTime,
    endTime,
    subject,
    location,
    referenceCode,
    body: bookingHtmlBody,
  };
};
