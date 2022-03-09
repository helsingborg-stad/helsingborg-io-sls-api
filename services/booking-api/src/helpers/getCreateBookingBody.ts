import { CreateBookingRequestBody, BookingRequest } from './types';

export default (bookingRequest: BookingRequest): CreateBookingRequestBody => {
  const {
    startTime,
    endTime,
    organizationRequiredAttendees,
    externalRequiredAttendees,
    subject,
    body,
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
    body,
  };
};
