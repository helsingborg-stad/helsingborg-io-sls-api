import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/create';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

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
const mockEvent = {
  body: JSON.stringify(mockBody),
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates a booking successfully', async () => {
  expect.assertions(2);

  const responseData = JSON.stringify({
    jsonapi: { version: '1.0' },
    data: {
      type: 'booking',
      id: '123456789',
    },
  });
  const expectedResult = {
    body: responseData,
    headers: mockHeaders,
    statusCode: 200,
  };

  booking.create.mockResolvedValueOnce({ data: responseData });

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

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(2);

  const body = JSON.stringify({
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
  });

  const errorMessage =
    'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message: errorMessage,
      },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main({ body });

  expect(result).toEqual(expectedResult);
  expect(booking.create).toHaveBeenCalledTimes(0);
});
