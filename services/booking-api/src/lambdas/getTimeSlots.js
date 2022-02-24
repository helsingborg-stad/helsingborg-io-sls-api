import to from 'await-to-js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import * as response from '../libs/response';

import createSlotsWithinTimeSpan from '../helpers/createSlots';
import getTimeSpans from '../helpers/getTimeSpans';

dayjs.extend(utc);

export async function main(event) {
  console.log('EVENT: ', JSON.stringify(event, undefined));
  const body = JSON.parse(event.body);

  const { startTime, endTime, attendees = [], meetingDuration = 60, meetingBuffer = 15 } = body;

  if (attendees.length === 0 || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message: 'Missing one or more required parameters: "attendees", "startTime", "endTime"',
    });
  }

  const getTimeSpansBody = {
    emails: attendees,
    startTime,
    endTime,
    meetingDurationMinutes: meetingDuration + meetingBuffer,
  };
  const [getTimeSpansError, timeSpansResult] = await to(getTimeSpans(getTimeSpansBody));
  if (getTimeSpansError) {
    console.error('Could not get time spans: ', getTimeSpansError);
    return response.failure(getTimeSpansError);
  }

  const timeSlots = {};
  Object.keys(timeSpansResult).forEach(email => {
    timeSlots[email] = {};

    timeSpansResult[email].forEach(({ StartTime, EndTime }) => {
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
