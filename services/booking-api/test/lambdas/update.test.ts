// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/update';
import booking from '../../src/helpers/booking';
import { areAllAttendeesAvailable } from '../../src/helpers/timeSpanHelper';
import { GetTimeSpansResponse, BookingRequest } from '../../src/helpers/types';
import strings from '../../src/helpers/strings';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/helpers/isTimeslotTaken');
jest.mock('../../src/helpers/timeSpanHelper');

const { create, cancel, getTimeSpans } = jest.mocked(booking);
const mockedAreAllAttendeesAvailable = jest.mocked(areAllAttendeesAvailable);

const mockContext = { awsRequestId: 'xxxxx' };
const mockBookingId = '1a2bc3';
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

const mockEvent = {
  pathParameters: {
    id: mockBookingId,
  },
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

it('updates a booking successfully', async () => {
  expect.assertions(5);

  const responseData = {
    data: {
      attributes: {
        BookingId: '123456789',
      },
    },
  };

  const calendarBookingResponse = {
    data: responseData,
  };
  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { bookingId: '123456789' } }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  cancel.mockResolvedValueOnce(undefined);
  create.mockResolvedValueOnce(calendarBookingResponse);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.cancel).toHaveBeenCalledWith(mockBookingId);
  expect(booking.create).toHaveBeenCalledWith({
    requiredAttendees: ['outlook.user@helsingborg.se', 'user@test.se'],
    optionalAttendees: [],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    body: expect.stringContaining('<p>Förnamn: Test</p>'),
    location: 'secret location',
    referenceCode: 'code1234',
  });
  expect(result).toEqual(expectedResult);
});

it('does not update if timespan does not exist', async () => {
  expect.assertions(6);

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
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 400,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('throws when booking.cancel fails', async () => {
  expect.assertions(5);

  const statusCode = 500;
  const message = messages[statusCode];
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '500',
        code: '500',
        message: 'Timeslot cancellation failed',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  cancel.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('throws when booking.create fails', async () => {
  expect.assertions(5);

  const statusCode = 500;
  const message = messages[statusCode];
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '500',
        code: '500',
        message: 'Timeslot creation failed',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  cancel.mockResolvedValueOnce(undefined);
  create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).toHaveBeenCalledTimes(1);
  expect(result).toEqual(expectedResult);
});

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(5);

  const body = JSON.stringify({
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
  });
  const event = { ...mockEvent, body };

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

  const result = await main(event, mockContext);

  expect(getTimeSpans).not.toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).not.toHaveBeenCalled();
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
