// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/update';
import booking from '../../src/helpers/booking';
import { isTimeslotTaken } from '../../src/helpers/isTimeslotTaken';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/helpers/isTimeslotTaken');

jest.mock('../../src/helpers/booking');

const { search, create, cancel } = jest.mocked(booking);
const mockedTimeSlotTaken = jest.mocked(isTimeslotTaken);

const mockContext = { awsRequestId: 'xxxxx' };
const mockBookingId = '1a2bc3';
const mockBody = {
  requiredAttendees: ['outlook.user@helsingborg.se'],
  optionalAttendees: [],
  startTime: '2021-05-30T10:00:00',
  endTime: '2021-05-30T11:00:00',
  subject: 'economy',
  body: 'htmltext',
  location: 'secret location',
  referenceCode: 'code1234',
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

beforeEach(() => {
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

  cancel.mockResolvedValueOnce(undefined);
  create.mockResolvedValueOnce(calendarBookingResponse);
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedTimeSlotTaken.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).toHaveBeenCalledWith(mockBookingId);
  expect(booking.create).toHaveBeenCalledWith(mockBody);
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(isTimeslotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
});

it('does not update if timeslot is taken', async () => {
  expect.assertions(5);

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

  search.mockResolvedValueOnce(mockSearchResponse);
  mockedTimeSlotTaken.mockReturnValueOnce(true);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(isTimeslotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
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

  cancel.mockRejectedValueOnce({ status: statusCode, message });
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedTimeSlotTaken.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).not.toHaveBeenCalled();
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(isTimeslotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
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

  cancel.mockResolvedValueOnce(undefined);
  create.mockRejectedValueOnce({ status: statusCode, message });
  search.mockResolvedValueOnce(mockSearchResponse);
  mockedTimeSlotTaken.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).toHaveBeenCalledTimes(1);
  expect(booking.search).toHaveBeenCalledWith(mockSearchBody);
  expect(isTimeslotTaken).toHaveBeenCalledWith(mockSearchResponse.data.data.attributes);
});

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(5);

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
          'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"',
      },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main(event, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.create).not.toHaveBeenCalled();
  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.search).not.toHaveBeenCalled();
  expect(isTimeslotTaken).not.toHaveBeenCalled();
});
