import moment from 'moment';

type TimeInterval = { startTime: string; endTime: string };
type MSGraphTimeInterval = { StartTime: string; EndTime: string };
type TimeSpanData = Record<string, MSGraphTimeInterval[]>;

function isBookingInsideTimeSpan(booking: TimeInterval, timeSpan: TimeInterval) {
  const bookingStartTime = moment(booking.startTime);
  const bookingEndTime = moment(booking.endTime);
  const timeSpanStartTime = moment(timeSpan.startTime);
  const timeSpanEndTime = moment(timeSpan.endTime);
  return (
    bookingStartTime.isSameOrAfter(timeSpanStartTime) &&
    bookingEndTime.isSameOrBefore(timeSpanEndTime)
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
