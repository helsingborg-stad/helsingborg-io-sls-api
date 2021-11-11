import dayjs from 'dayjs';

import { main } from '../../lambdas/getTimeSlots';
import getTimeSpans from '../../helpers/getTimeSpans';

jest.mock('../../helpers/getTimeSpans');

const mockAttendee = 'outlook@helsingborg.se';
const secondMockAttendee = 'outlook_2@helsingborg.se';

const mockBody = {
  attendees: [mockAttendee, secondMockAttendee],
  startTime: '2021-10-26T08:00:00+01:00',
  endTime: '2021-10-26T10:00:00+01:00',
  meetingDuration: 60,
  meetingBuffer: 15,
};

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockEvent = {
  body: JSON.stringify(mockBody),
};

function createLambdaResponse(lambdaResult, statusCode = 200) {
  return {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { ...lambdaResult } }),
    headers: mockHeaders,
    statusCode,
  };
}

/**
 * Because the local machine and git pipeline have different
 * time offsets, this function is created to get the
 * result localized.
 */
const getLocalizedTime = date => dayjs(date).format('HH:mm:ssZ');

it('successfully returns available time slots for a single user', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    [mockAttendee]: [
      {
        StartTime: '2021-10-10T07:00:00+01:00',
        EndTime: '2021-10-10T09:00:00+01:00',
      },
    ],
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: getLocalizedTime('2021-10-10T08:00:00'),
          endTime: getLocalizedTime('2021-10-10T09:00:00'),
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time slots for multiple users', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    [mockAttendee]: [
      {
        StartTime: '2021-10-10T07:00:00+01:00',
        EndTime: '2021-10-10T09:00:00+01:00',
      },
    ],
    [secondMockAttendee]: [
      {
        StartTime: '2021-10-10T07:00:00+01:00',
        EndTime: '2021-10-10T10:00:00+01:00',
      },
    ],
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: getLocalizedTime('2021-10-10T08:00:00'),
          endTime: getLocalizedTime('2021-10-10T09:00:00'),
        },
      ],
    },
    [secondMockAttendee]: {
      '2021-10-10': [
        {
          startTime: getLocalizedTime('2021-10-10T08:00:00'),
          endTime: getLocalizedTime('2021-10-10T09:00:00'),
        },
        {
          startTime: getLocalizedTime('2021-10-10T09:15:00'),
          endTime: getLocalizedTime('2021-10-10T10:15:00'),
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time slots when fetching multiple time spans', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    [mockAttendee]: [
      {
        StartTime: '2021-10-10T07:00:00+01:00',
        EndTime: '2021-10-10T09:00:00+01:00',
      },
      {
        StartTime: '2021-10-10T11:00:00+01:00',
        EndTime: '2021-10-10T12:00:00+01:00',
      },
    ],
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: getLocalizedTime('2021-10-10T08:00:00'),
          endTime: getLocalizedTime('2021-10-10T09:00:00'),
        },
        {
          startTime: getLocalizedTime('2021-10-10T12:00:00'),
          endTime: getLocalizedTime('2021-10-10T13:00:00'),
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time with another meetingDuration and meetingBuffer', async () => {
  expect.assertions(1);

  const body = {
    ...mockBody,
    meetingDuration: 15,
    meetingBuffer: 5,
  };
  const event = {
    body: JSON.stringify(body),
  };

  getTimeSpans.mockResolvedValueOnce({
    [mockAttendee]: [
      {
        StartTime: '2021-10-10T07:00:00+01:00',
        EndTime: '2021-10-10T08:00:00+01:00',
      },
    ],
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: getLocalizedTime('2021-10-10T08:00:00'),
          endTime: getLocalizedTime('2021-10-10T08:15:00'),
        },
        {
          startTime: getLocalizedTime('2021-10-10T08:20:00'),
          endTime: getLocalizedTime('2021-10-10T08:35:00'),
        },
        {
          startTime: getLocalizedTime('2021-10-10T08:40:00'),
          endTime: getLocalizedTime('2021-10-10T08:55:00'),
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(event);

  expect(result).toEqual(expectedResult);
});

it('returns failure if no attendees is provided in the request', async () => {
  expect.assertions(1);

  const body = {
    ...mockBody,
    attendees: [],
  };
  const event = {
    body: JSON.stringify(body),
  };

  const expectedError = {
    status: '403',
    code: '403',
    message: 'Missing one or more required parameters: "attendees", "startTime", "endTime"',
  };

  const expectedResult = createLambdaResponse(expectedError, 403);

  const result = await main(event);

  expect(result).toEqual(expectedResult);
});

it('returns no time slots for a user if a time span is empty', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    [mockAttendee]: [],
  });

  const expectedResult = createLambdaResponse({ [mockAttendee]: {} });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});
