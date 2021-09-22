import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/create';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

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
  body: JSON.stringify(mockBody),
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

it('creates a booking successfully', async () => {
  expect.assertions(2);

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
    headers: mockHeaders,
    statusCode: 200,
  };

  booking.create.mockResolvedValueOnce(calendarBookingResponse);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.create).toHaveBeenCalledWith(mockBody);
});

it('throws when booking.create fails', async () => {
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

  booking.create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});
