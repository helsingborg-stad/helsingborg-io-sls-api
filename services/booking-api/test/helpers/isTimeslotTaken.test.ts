import { isTimeslotTaken } from '../../src/helpers/isTimeslotTaken';

const mockAttendeeRequiredAccepted = {
  Type: 'Required',
  Status: 'Accepted',
};

const mockAttendeeRequiredDeclined = {
  Type: 'Required',
  Status: 'Declined',
};

const mockAttendeeOptionalAccepted = {
  Type: 'Optional',
  Status: 'Accepted',
};

const mockAttendeeOptionalDeclined = {
  Type: 'Optional',
  Status: 'Declined',
};

describe('isTimeSlotTaken', () => {
  it('returns true if every required attendee has accepted', () => {
    const bookings = [
      { BookingId: '123', Attendees: [mockAttendeeRequiredAccepted, mockAttendeeRequiredAccepted] },
    ];
    const result = isTimeslotTaken(bookings);
    expect(result).toBe(true);
  });

  it('returns false if at least one required attendee has declined', () => {
    const bookings = [
      { BookingId: '123', Attendees: [mockAttendeeRequiredAccepted, mockAttendeeRequiredDeclined] },
    ];
    const result = isTimeslotTaken(bookings);
    expect(result).toBe(false);
  });

  it('returns true if every required attendee has accepted even if optional attendees have declined', () => {
    const bookings = [
      {
        BookingId: '123',
        Attendees: [
          mockAttendeeRequiredAccepted,
          mockAttendeeRequiredAccepted,
          mockAttendeeOptionalDeclined,
          mockAttendeeOptionalDeclined,
        ],
      },
    ];
    const result = isTimeslotTaken(bookings);
    expect(result).toBe(true);
  });

  it('returns false if at least one required attendee has declined even if all other required or optional attendees have accepted', () => {
    const bookings = [
      {
        BookingId: '123',
        Attendees: [
          mockAttendeeRequiredAccepted,
          mockAttendeeRequiredDeclined,
          mockAttendeeOptionalAccepted,
          mockAttendeeOptionalAccepted,
        ],
      },
    ];
    const result = isTimeslotTaken(bookings);
    expect(result).toBe(false);
  });

  it('returns true if at least one of several bookings is busy', () => {
    const bookings = [
      { BookingId: '123', Attendees: [mockAttendeeRequiredAccepted, mockAttendeeRequiredDeclined] },
      { BookingId: '123', Attendees: [mockAttendeeRequiredAccepted, mockAttendeeRequiredAccepted] },
      { BookingId: '123', Attendees: [mockAttendeeRequiredDeclined, mockAttendeeRequiredDeclined] },
    ];
    const result = isTimeslotTaken(bookings);
    expect(result).toBe(true);
  });
});
