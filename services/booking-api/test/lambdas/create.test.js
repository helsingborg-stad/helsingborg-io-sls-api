import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/create';
import getSsmParameters from '../../helpers/getSsmParameters';
import makeBookingRequest from '../../helpers/makeBookingRequest';

jest.mock('../../helpers/getSsmParameters');
jest.mock('../../helpers/makeBookingRequest');

const mockUrl = 'www.datatorgetMock.se';
const mockApiKey = '123';
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

it('creates a booking successfully', async () => {
  expect.assertions(2);

  const expectedUrl = `${mockUrl}/create`;
  const calendarBookingResponse = {
    data: {
      type: 'booking',
      id: '123456789',
    },
  };
  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, ...calendarBookingResponse }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  };

  getSsmParameters.mockResolvedValueOnce({ outlookBookingEndpoint: mockUrl, apiKey: mockApiKey });
  makeBookingRequest.mockResolvedValueOnce({
    data: calendarBookingResponse,
  });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(makeBookingRequest).toHaveBeenCalledWith(expectedUrl, mockApiKey, mockBody);
});

it('throws when fetching from SSM parameterstore fails', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];

  getSsmParameters.mockRejectedValueOnce({ statusCode, message });

  await expect(main(mockEvent)).rejects.toThrow(message);
});

it('throws when creating a booking fails', async () => {
  expect.assertions(1);

  const status = 500;
  const errorMessage = messages[status];

  getSsmParameters.mockResolvedValueOnce({ outlookBookingEndpoint: mockUrl, apiKey: mockApiKey });
  makeBookingRequest.mockRejectedValueOnce({ errorMessage, status });

  await expect(main(mockEvent)).rejects.toThrow(errorMessage);
});
