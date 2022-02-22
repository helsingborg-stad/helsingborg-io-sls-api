import { isTimeSpanValid } from '../../src/helpers/isTimeSpanValid';

const mockTimeSpan1 = {
  StartTime: '2022-02-21T08:00:00Z',
  EndTime: '2022-02-21T16:00:00Z',
};

const mockTimeSpan2 = {
  StartTime: '2022-02-21T12:00:00Z',
  EndTime: '2022-02-21T16:00:00Z',
};

const mockBooking1 = {
  startTime: '2022-02-21T10:00:00Z',
  endTime: '2022-02-21T11:00:00Z',
};

const mockBooking2 = {
  startTime: '2022-02-21T15:30:00Z',
  endTime: '2022-02-21T16:30:00Z',
};

describe('isTimeSpanValid', () => {
  it('returns true if booking is within timespan', () => {
    const timeSpanData = {
      attendee1: [mockTimeSpan1],
    };
    const result = isTimeSpanValid(mockBooking1, timeSpanData);
    expect(result).toBe(true);
  });

  it('returns false if booking is outside timespan', () => {
    const timeSpanData = {
      attendee1: [mockTimeSpan2],
    };
    const result = isTimeSpanValid(mockBooking1, timeSpanData);
    expect(result).toBe(false);
  });

  it('returns false if booking is only partially inside timespan', () => {
    const timeSpanData = {
      attendee1: [mockTimeSpan1],
    };
    const result = isTimeSpanValid(mockBooking2, timeSpanData);
    expect(result).toBe(false);
  });

  it('returns true if all attendees have valid timespans', () => {
    const timeSpanData = {
      attendee1: [mockTimeSpan1],
      attendee2: [mockTimeSpan1],
    };
    const result = isTimeSpanValid(mockBooking1, timeSpanData);
    expect(result).toBe(true);
  });

  it('returns false if not all attendees have valid timespans', () => {
    const timeSpanData = {
      attendee1: [mockTimeSpan1],
      attendee2: [mockTimeSpan2],
    };
    const result = isTimeSpanValid(mockBooking1, timeSpanData);
    expect(result).toBe(false);
  });
});
