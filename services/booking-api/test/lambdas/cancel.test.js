import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/cancel';
import { getSsmParameters } from '../../helpers/getSsmParameters';
import { makeBookingRequest } from '../../helpers/makeBookingRequest';

jest.mock('../../helpers/getSsmParameters');
jest.mock('../../helpers/makeBookingRequest');

const mockUrl = 'www.datatorgetMock.se';
const mockBookingId = '1a2bc3';
const mockApiKey = '123';
const mockEvent = {
  pathParameters: {
    id: mockBookingId,
  },
};

const expectedResult = {
  body: JSON.stringify({
    jsonapi: { version: '1.0' },
    data: { bookingId: mockBookingId },
  }),
  headers: {
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': '*',
  },
  statusCode: 200,
};

it('cancels a booking successfully', async () => {
  expect.assertions(2);

  const expectedUrl = `${mockUrl}/cancel`;

  getSsmParameters.mockResolvedValueOnce({ outlookBookingEndpoint: mockUrl, apiKey: mockApiKey });
  makeBookingRequest.mockResolvedValueOnce([null]);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(makeBookingRequest).toHaveBeenCalledWith(expectedUrl, mockApiKey, {
    bookingId: mockBookingId,
  });
});

it('throws when fetching from SSM parameterstore fails', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];

  getSsmParameters.mockRejectedValueOnce({ statusCode, message });

  await expect(main(mockEvent)).rejects.toThrow(message);
});

it('throws when cancel a booking fails', async () => {
  expect.assertions(1);

  const status = 500;
  const errorMessage = messages[status];

  getSsmParameters.mockResolvedValueOnce({ outlookBookingEndpoint: mockUrl, apiKey: mockApiKey });
  makeBookingRequest.mockRejectedValueOnce({ errorMessage, status });

  await expect(main(mockEvent)).rejects.toThrow(errorMessage);
});
