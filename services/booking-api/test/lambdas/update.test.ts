// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/update';
import booking from '../../src/helpers/booking';
import { BookingRequest } from '../../src/helpers/types';
import { validateCreateBookingRequest } from './../../src/helpers/validateCreateBookingRequest';

jest.mock('../../src/helpers/booking');
jest.mock('./../../src/helpers/validateCreateBookingRequest');

const { create, cancel } = jest.mocked(booking);
const mockedValidateCreateBookingRequest = jest.mocked(validateCreateBookingRequest);

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

beforeEach(() => {
  jest.resetAllMocks();
});

it('updates a booking successfully', async () => {
  expect.assertions(4);

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

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  cancel.mockResolvedValueOnce(undefined);
  create.mockResolvedValueOnce(calendarBookingResponse);

  const result = await main(mockEvent, mockContext);

  expect(mockedValidateCreateBookingRequest).toHaveBeenCalled();
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

it('throws when booking.cancel fails', async () => {
  expect.assertions(4);

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

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  cancel.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(mockedValidateCreateBookingRequest).toHaveBeenCalled();
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});

it('throws when booking.create fails', async () => {
  expect.assertions(4);

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

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  cancel.mockResolvedValueOnce(undefined);
  create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(mockedValidateCreateBookingRequest).toHaveBeenCalled();
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).toHaveBeenCalledTimes(1);
  expect(result).toEqual(expectedResult);
});

it('throws when vaildateCreateBookingRequest fails', async () => {
  expect.assertions(3);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: 'detail',
        message: 'message',
      },
    }),
    headers: mockHeaders,
    statusCode: 400,
  };

  mockedValidateCreateBookingRequest.mockRejectedValueOnce({
    detail: 'detail',
    message: 'message',
  });

  const result = await main(mockEvent, mockContext);

  expect(booking.cancel).not.toHaveBeenCalled();
  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
