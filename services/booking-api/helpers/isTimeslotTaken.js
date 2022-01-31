/**
 * @param {{ Attendees: { Type: string, Status: string }[]}} booking
 * @returns { boolean }
 */
function allRequiredAttendeesHaveAccepted({ Attendees }) {
  return Attendees.filter(({ Type }) => Type === 'Required').every(
    ({ Status }) => Status === 'Accepted'
  );
}

/**
 * @param {{ Attendees: { Type: string, Status: string }[]}[]} bookings
 * @returns { boolean }
 */
function isTimeslotTaken(bookings) {
  return bookings.some(allRequiredAttendeesHaveAccepted);
}

export { isTimeslotTaken };
