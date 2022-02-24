import dayjs from 'dayjs';
import { TimeInterval, MSGraphTimeInterval, TimeSpanData } from './types';

function isBookingInsideTimeSpan(booking: TimeInterval, timeSpan: TimeInterval) {
  const bookingStartTime = dayjs(booking.startTime);
  const bookingEndTime = dayjs(booking.endTime);
  const timeSpanStartTime = dayjs(timeSpan.startTime);
  const timeSpanEndTime = dayjs(timeSpan.endTime);
  return (
    (bookingStartTime.isSame(timeSpanStartTime) || bookingStartTime.isAfter(timeSpanStartTime)) &&
    (bookingEndTime.isSame(timeSpanEndTime) || bookingEndTime.isBefore(timeSpanEndTime))
  );
}

function timeSpanArrayCoversBooking(
  timeArray: MSGraphTimeInterval[],
  bookingInterval: TimeInterval
) {
  return timeArray.some(timeSpan =>
    isBookingInsideTimeSpan(bookingInterval, {
      startTime: timeSpan.StartTime,
      endTime: timeSpan.EndTime,
    })
  );
}

function areAllAttendeesAvailable(bookingInterval: TimeInterval, timeSpanData: TimeSpanData) {
  const timeSpanArrays = Object.values(timeSpanData);
  return timeSpanArrays.every(timeSpanArray =>
    timeSpanArrayCoversBooking(timeSpanArray, bookingInterval)
  );
}

export { areAllAttendeesAvailable };
