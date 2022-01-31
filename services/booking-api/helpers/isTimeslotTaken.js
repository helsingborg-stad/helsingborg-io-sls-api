/**
 * @param {{ BookingId: string, Attendees: [{ Type: string, Status: string }]}[]} bookings
 * @returns { boolean }
 */
function isTimeslotTaken(bookings) {
  const declinedBookings = ({ Attendees }) =>
    Attendees.some(({ Type, Status }) => Type === 'Required' && Status === 'Declined');

  return bookings.filter(declinedBookings)?.length === 0;
}

export { isTimeslotTaken };
