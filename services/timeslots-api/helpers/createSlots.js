import dayjs from 'dayjs';

/**
 * Function for creating time slots within a
 * bigger time span.
 *
 * @param {dayjs} timeSpanStart Dayjs object
 * @param {dayjs} timeSpanEnd Dayjs object
 * @param {number} meetingDuration The length of the meeting
 * @param {number} meetingBuffer The time between two meetings
 * @returns {{startTime: string, endTime: strig}[]} Array of start times and end times objects
 */
const createSlotsWithinTimeSpan = (
  timeSpanStart,
  timeSpanEnd,
  meetingDuration,
  meetingBuffer
) => {
  const timeSlots = [];

  let slotStart = timeSpanStart;

  while (slotStart < timeSpanEnd) {
    const slotEnd = slotStart.add(meetingDuration, 'minutes');

    if (slotEnd <= timeSpanEnd) {
      const endTime = dayjs(slotEnd).utc().format('HH:mm:ssZ');
      const startTime = dayjs(slotStart).utc().format('HH:mm:ssZ');

      timeSlots.push({ startTime, endTime });
    }

    slotStart = slotEnd.add(meetingBuffer, 'minutes');
  }

  return timeSlots;
};

export default createSlotsWithinTimeSpan;
