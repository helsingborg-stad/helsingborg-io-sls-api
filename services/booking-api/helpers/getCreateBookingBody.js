export default body => {
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
