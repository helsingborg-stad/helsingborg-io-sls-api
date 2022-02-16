export interface BookingBody {
  requiredAttendees?: string[];
  startTime?: string;
  endTime?: string;
  optionalAttendees?: string[];
  subject?: string;
  location?: string;
  referenceCode?: string;
  body?: string;
}

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
