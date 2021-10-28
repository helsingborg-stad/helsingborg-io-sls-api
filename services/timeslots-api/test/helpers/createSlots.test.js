import dayjs from 'dayjs';

import createSlotsWithinTimeSpan from '../../helpers/createSlots';

let timeSpanStart;
let timeSpanEnd;

let meetingDuration;
let meetingBuffer;
let startTime;

beforeEach(() => {
  // 60 min difference between start and end
  timeSpanStart = dayjs(1635490665853);
  timeSpanEnd = dayjs(1635494265853);

  meetingDuration = 30;
  meetingBuffer = 15;
  startTime = dayjs(timeSpanStart).format('HH:mm:ss');
});

it('successfully creates timeslot(s) within time span', () => {
  const endTime = dayjs(timeSpanStart).add(meetingDuration, 'minutes').format('HH:mm:ss');

  const expectedResult = [{ startTime, endTime }];

  const result = createSlotsWithinTimeSpan(
    timeSpanStart,
    timeSpanEnd,
    meetingDuration,
    meetingBuffer
  );

  expect(result).toEqual(expectedResult);
});

it('adds the appropriate number of timeslots (with buffer) within time span', () => {
  meetingDuration = 20;

  const firstTimeSlotStart = dayjs(timeSpanStart);
  const firstTimeSlotEnd = firstTimeSlotStart.add(meetingDuration, 'minutes');

  const secondTimeSlotStart = firstTimeSlotStart.add(meetingDuration + meetingBuffer, 'minutes');
  const secondTimeSlotEnd = firstTimeSlotStart.add(2 * meetingDuration + meetingBuffer, 'minutes');

  const expectedResult = [
    {
      startTime: firstTimeSlotStart.format('HH:mm:ss'),
      endTime: firstTimeSlotEnd.format('HH:mm:ss'),
    },
    {
      startTime: secondTimeSlotStart.format('HH:mm:ss'),
      endTime: secondTimeSlotEnd.format('HH:mm:ss'),
    },
  ];

  const result = createSlotsWithinTimeSpan(
    timeSpanStart,
    timeSpanEnd,
    meetingDuration,
    meetingBuffer
  );

  expect(result).toEqual(expectedResult);
});

it('returns no timeslot(s) if timeSpanStart is bigger than timeSpanEnd', () => {
  timeSpanStart = dayjs(1635494265853);
  timeSpanEnd = dayjs(1635490665853);

  const result = createSlotsWithinTimeSpan(
    timeSpanStart,
    timeSpanEnd,
    meetingDuration,
    meetingBuffer
  );

  expect(result).toEqual([]);
});
