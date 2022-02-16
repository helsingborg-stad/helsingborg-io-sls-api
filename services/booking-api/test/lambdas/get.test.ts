// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/get';
import booking from '../../src/helpers/booking';

jest.mock('../../src/helpers/booking');

const { get } = jest.mocked(booking);
const mockBookingId = '1a2bc3';
const mockEvent = {
  pathParameters: {
    id: mockBookingId,
  },
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockCalendarBooking = {
  type: 'booking',
  id: '123456789',
  attributes: {
    attendee: 'outlook.user@helsingborg.se',
    subject: 'amne ##kod12345',
    location: 'plats',
    status: 'Busy',
    startTime: '2021-05-30T11:00:00',
    endTime: '2021-05-30T12:00:00',
    referenceCode: 'kod12345',
    responseType: 'Unknown',
  },
};

const getBookingMockData = {
  jsonapi: { version: '1.0' },
  data: mockCalendarBooking,
};

it('gets a booking successfully', async () => {
  expect.assertions(2);

  const expectedResult = {
    body: JSON.stringify(getBookingMockData),
    headers: mockHeaders,
    statusCode: 200,
  };

  get.mockResolvedValueOnce({
    data: {
      data: mockCalendarBooking,
    },
  });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.get).toHaveBeenCalledWith(mockBookingId);
});

it('throws when fetching a booking fails', async () => {
  expect.assertions(1);

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

  get.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});