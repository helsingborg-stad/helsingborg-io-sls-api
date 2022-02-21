import { Attendee, BookingAttributes } from './booking';

/**
 * @param {{ Attendees: { Type: string, Status: string }[]}} booking
 * @returns { boolean }
 */
function isBookingBusy({ Attendees }: { Attendees: Attendee[] }) {
  return Attendees.filter(({ Type }) => Type === 'Required').every(
    ({ Status }) => Status !== 'Declined'
  );
}

/**
 * @param {{ Attendees: { Type: string, Status: string }[]}[]} bookings
 * @returns { boolean }
 */
function isTimeslotTaken(bookings: BookingAttributes[]) {
  return bookings.some(isBookingBusy);
}

export { isTimeslotTaken };
