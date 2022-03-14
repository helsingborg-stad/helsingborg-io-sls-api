// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/create';
import booking from '../../src/helpers/booking';
import getMeetingHtmlBody from '../../src/helpers/getMeetingHtmlBody';
import { BookingRequest, BookingSearchResponse } from '../../src/helpers/types';
import { isTimeslotTaken } from '../../src/helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../../src/helpers/timeSpanHelper';
import { GetTimeSpansResponse } from './../../src/helpers/types';
import strings from './../../src/helpers/strings';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/helpers/isTimeslotTaken');
jest.mock('../../src/helpers/timeSpanHelper');
jest.mock('../../src/helpers/getMeetingHtmlBody');

const { search, create, getTimeSpans, createRemoteMeeting } = jest.mocked(booking);
const mockedIsTimeSlotTaken = jest.mocked(isTimeslotTaken);
const mockedAreAllAttendeesAvailable = jest.mocked(areAllAttendeesAvailable);
const mockedGetMeetingHtmlBody = jest.mocked(getMeetingHtmlBody);

const mockBody: BookingRequest = {
  organizationRequiredAttendees: ['outlook.user@helsingborg.se'],
  externalRequiredAttendees: ['user@test.se'],
  optionalAttendees: [],
  startTime: '2021-05-30T10:00:00',
  endTime: '2021-05-30T11:00:00',
  subject: 'economy',
  location: 'secret location',
  referenceCode: 'code1234',
  remoteMeeting: false,
  formData: {
    firstname: {
      value: 'Test',
      name: 'Förnamn',
    },
  },
};
const mockContext = {
  awsRequestId: '123',
};
const mockEvent = {
  body: JSON.stringify(mockBody),
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const getTimeSpansResponse: GetTimeSpansResponse = {
  data: {
    data: {
      attributes: {
        mockAttendee: [{ StartTime: 'mock start time', EndTime: 'mock end time' }],
      },
    },
  },
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2021-05-29T10:00:00'));
  jest.resetAllMocks();
});

it('creates a booking successfully', async () => {
  expect.assertions(7);

  const searchResponseData: BookingSearchResponse['data'] = {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [
            {
              Type: 'Required',
              Status: 'Declined',
            },
          ],
        },
      ],
    },
  };
  const responseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        BookingId: '123456789',
      },
    },
  };
  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { bookingId: '123456789' } }),
    headers: mockHeaders,
    statusCode: 200,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce({ data: searchResponseData });
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  mockedGetMeetingHtmlBody.mockReturnValueOnce('html');
  create.mockResolvedValueOnce({ data: responseData });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).toHaveBeenCalled();
  expect(mockedGetMeetingHtmlBody).toHaveBeenCalledWith(
    {
      firstname: { name: 'Förnamn', value: 'Test' },
    },
    undefined
  );
  expect(booking.create).toHaveBeenCalledWith({
    requiredAttendees: ['outlook.user@helsingborg.se', 'user@test.se'],
    optionalAttendees: [],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    body: 'html',
    location: 'secret location',
    referenceCode: 'code1234',
  });
  expect(result).toEqual(expectedResult);
});

it('calls "getMeetingHtmlBody" with a meeting link when remoteMeeting is true', async () => {
  expect.assertions(1);

  const searchResponseData: BookingSearchResponse['data'] = {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [
            {
              Type: 'Required',
              Status: 'Declined',
            },
          ],
        },
      ],
    },
  };
  const responseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        BookingId: '123456789',
      },
    },
  };
  const remoteMeetingResponseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        Id: 'string',
        Subject: 'string',
        OnlineMeetingUrl: 'remote.meeting.link',
      },
    },
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce({ data: searchResponseData });
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  createRemoteMeeting.mockResolvedValueOnce({ data: remoteMeetingResponseData });
  create.mockResolvedValueOnce({ data: responseData });

  await main({ body: JSON.stringify({ ...mockBody, remoteMeeting: true }) }, mockContext);

  expect(mockedGetMeetingHtmlBody).toHaveBeenCalledWith(
    {
      firstname: { name: 'Förnamn', value: 'Test' },
    },
    'remote.meeting.link'
  );
});

it('throws when booking.create fails', async () => {
  expect.assertions(6);

  const statusCode = 500;
  const message = messages[statusCode];
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '500',
        code: '500',
        message,
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce({ data: { data: { attributes: [] } } });
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  mockedGetMeetingHtmlBody.mockReturnValueOnce('html');
  create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).toHaveBeenCalled();
  expect(booking.create).toHaveBeenCalledWith({
    requiredAttendees: ['outlook.user@helsingborg.se', 'user@test.se'],
    optionalAttendees: [],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    body: 'html',
    location: 'secret location',
    referenceCode: 'code1234',
  });
  expect(result).toEqual(expectedResult);
});

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(6);

  const body = JSON.stringify({
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
  });

  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: strings.booking.create.missingRequiredParamter,
        message: errorMessage,
      },
    }),
    headers: mockHeaders,
    statusCode: 400,
  };

  const result = await main({ body }, mockContext);

  expect(getTimeSpans).not.toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).not.toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('returns failure when timespan does not exist', async () => {
  expect.assertions(6);

  const statusCode = 400;
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: strings.booking.create.timespanNotExisting,
        message: 'No timeslot exists in the given interval',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('returns error if startTime is in the passed', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2021-05-30T12:00:00'));
  expect.assertions(6);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: strings.booking.create.startTimePassed,
        message: 'Parameter "startTime" cannot be set to a passed value',
      },
    }),
    headers: mockHeaders,
    statusCode: 400,
  };

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).not.toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).not.toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('returns failure when timeslot is already taken', async () => {
  expect.assertions(6);

  const searchResponseData = {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [
            {
              Type: 'Required',
              Status: 'Not declined',
            },
          ],
        },
      ],
    },
  };

  const statusCode = 400;
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: strings.booking.create.timeslotNotAvailable,
        message: 'Timeslot not available for booking',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce({ data: searchResponseData });
  mockedIsTimeSlotTaken.mockReturnValueOnce(true);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
