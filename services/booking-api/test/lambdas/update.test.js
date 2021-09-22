import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/update';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

const mockBookingId = '1a2bc3';
const mockBody = {
  attendee: 'outlook.user@helsingborg.se',
  startTime: '2021-05-30T10:00:00',
  endTime: '2021-05-30T11:00:00',
  subject: 'economy',
  body: 'htmltext',
  location: 'secret location',
  referenceCode: 'code1234',
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
  expect.assertions(3);

  const calendarBookingResponse = {
    data: {
      data: {
        type: 'booking',
        id: '123456789',
      },
    },
  };
  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, ...calendarBookingResponse.data }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  };

  booking.cancel.mockResolvedValueOnce();
  booking.create.mockResolvedValueOnce(calendarBookingResponse);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).toHaveBeenCalledWith({ bookingId: mockBookingId });
  expect(booking.create).toHaveBeenCalledWith(mockBody);
});

it('throws when booking.cancel fails', async () => {
  expect.assertions(2);

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

  booking.cancel.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.create).toHaveBeenCalledTimes(0);
});

it('throws when booking.create fails', async () => {
  expect.assertions(3);

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

  booking.cancel.mockResolvedValueOnce();
  booking.create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.cancel).toHaveBeenCalledTimes(1);
  expect(booking.create).toHaveBeenCalledTimes(1);
});
