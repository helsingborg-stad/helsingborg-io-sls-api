import { TimeInterval } from './../helpers/types';
import to from 'await-to-js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import * as response from '../libs/response';

import createSlotsWithinTimeSpan from '../helpers/createSlots';
import booking from '../helpers/booking';

dayjs.extend(utc);

export async function main(event: {
  queryStringParameters: {
    startTime: string;
    endTime: string;
    attendees: string;
    meetingDuration?: number;
    meetingBuffer?: number;
  };
}) {
  console.log('EVENT: ', JSON.stringify(event, undefined));

  const {
    startTime,
    endTime,
    meetingDuration = 60,
    meetingBuffer = 15,
    attendees,
  } = event.queryStringParameters;

  let parsedAttendees: string[] = [];

  try {
    parsedAttendees = JSON.parse(attendees);
  } catch {
    return response.failure({
      status: 403,
      message: 'Value for parameter "attendees" is not valid',
    });
  }

  if (parsedAttendees.length === 0 || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message: 'Missing one or more required parameters: "attendees", "startTime", "endTime"',
    });
  }

  const getTimeSpansBody = {
    emails: parsedAttendees,
    startTime,
    endTime,
    meetingDurationMinutes: meetingDuration + meetingBuffer,
  };
  const [getTimeSpansError, timeSpansResult] = await to(booking.getTimeSpans(getTimeSpansBody));
  const timeSpanData = timeSpansResult?.data?.data?.attributes;
  if (getTimeSpansError || !timeSpanData) {
    console.error('Could not get time spans: ', getTimeSpansError);
    return response.failure(getTimeSpansError);
  }

  const timeSlots: Record<string, Record<string, TimeInterval[]>> = {};
  Object.keys(timeSpanData).forEach(email => {
    timeSlots[email] = {};

    timeSpanData[email].forEach(({ StartTime, EndTime }) => {
      const date = dayjs(StartTime).utc().format('YYYY-MM-DD');

      if (!timeSlots[email][date]) {
        timeSlots[email][date] = [];
      }

      const start = dayjs(StartTime);
      const end = dayjs(EndTime);

      const slots = createSlotsWithinTimeSpan(start, end, meetingDuration, meetingBuffer);
      timeSlots[email][date].push(...slots);
    });
  });

  return response.success(200, timeSlots);
}
