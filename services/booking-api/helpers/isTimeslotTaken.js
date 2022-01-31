/**
 * @param {{ Attendees: { Type: string, Status: string }[]}} booking
 * @returns { boolean }
 */
function isBookingBusy({ Attendees }) {
  return Attendees.filter(({ Type }) => Type === 'Required').every(
    ({ Status }) => Status === 'Accepted'
  );
}

/**
 * @param {{ Attendees: { Type: string, Status: string }[]}[]} bookings
 * @returns { boolean }
 */
function isTimeslotTaken(bookings) {
  return bookings.some(isBookingBusy);
}

export { isTimeslotTaken };
