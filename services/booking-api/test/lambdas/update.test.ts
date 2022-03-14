// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/update';
import booking from '../../src/helpers/booking';
import { isTimeslotTaken } from '../../src/helpers/isTimeslotTaken';
import { areAllAttendeesAvailable } from '../../src/helpers/timeSpanHelper';
import { GetTimeSpansResponse, BookingRequest } from '../../src/helpers/types';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/helpers/isTimeslotTaken');
jest.mock('../../src/helpers/timeSpanHelper');

const { search, create, cancel, getTimeSpans } = jest.mocked(booking);
const mockedIsTimeSlotTaken = jest.mocked(isTimeslotTaken);
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
const mockSearchBody = {
  startTime: mockBody.startTime,
  endTime: mockBody.endTime,
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
const mockSearchResponse = {
  data: {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [],
        },
      ],
    },
  },
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
  jest.resetAllMocks();
});

it('updates a booking successfully', async () => {
  expect.assertions(7);

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
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  cancel.mockResolvedValueOnce(undefined);
  create.mockResolvedValueOnce(calendarBookingResponse);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(mockedIsTimeSlotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
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
  expect.assertions(7);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: { status: '403', code: '403', message: 'No timeslot exists in the given interval' },
    }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 403,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).not.toHaveBeenCalled();
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('does not update if timeslot is taken', async () => {
  expect.assertions(7);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: { status: '403', code: '403', message: 'Timeslot not available for booking' },
    }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 403,
  };

  getTimeSpans.mockResolvedValueOnce(getTimeSpansResponse);
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedIsTimeSlotTaken.mockReturnValueOnce(true);

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(mockedIsTimeSlotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('throws when booking.cancel fails', async () => {
  expect.assertions(7);

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
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  cancel.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(mockedIsTimeSlotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('throws when booking.create fails', async () => {
  expect.assertions(7);

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
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedIsTimeSlotTaken.mockReturnValueOnce(false);
  cancel.mockResolvedValueOnce(undefined);
  create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(getTimeSpans).toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(mockedIsTimeSlotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).toHaveBeenCalledTimes(1);
  expect(result).toEqual(expectedResult);
});

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(7);

  const body = JSON.stringify({
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
  });
  const event = { ...mockEvent, body };

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message:
          'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime"',
      },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main(event, mockContext);

  expect(getTimeSpans).not.toHaveBeenCalled();
  expect(mockedAreAllAttendeesAvailable).not.toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(mockedIsTimeSlotTaken).not.toHaveBeenCalled();
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
