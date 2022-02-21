import moment from 'moment';

type TimeInterval = { startTime: string; endTime: string };
type TimeSpanData = Record<string, TimeInterval[]>;

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

function isTimeSpanValid(bookingInterval: TimeInterval, timeSpanData: TimeSpanData) {
  return Object.values(timeSpanData).every(timeArray =>
    timeArray.some(timeSpan => isBookingInsideTimeSpan(bookingInterval, timeSpan))
  );
}

export { isTimeSpanValid };
