import dayjs from 'dayjs';

type TimeInterval = { startTime: string; endTime: string };
type MSGraphTimeInterval = { StartTime: string; EndTime: string };
type TimeSpanData = Record<string, MSGraphTimeInterval[]>;

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
