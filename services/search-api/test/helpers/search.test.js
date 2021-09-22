import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { searchBookings } from '../../helpers/search';
import params from '../../../../libs/params';
import * as request from '../../../../libs/request';

jest.mock('../../../../libs/params');
jest.mock('../../../../libs/request');

const mockEndpoint = 'https://mockEndpoint.se';
const mockApiKey = '1235';
const mockBody = {
  attendee: 'outlook.user@helsingborg.se',
  startDate: '2021-09-21T00:00:00.000Z',
  endDate: '2021-09-24T00:00:00.000Z',
};

process.env.stage = 'dev';

beforeEach(() => {
  jest.resetAllMocks();
});

it('throws if failing to fetch SSM parameters', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];

  params.read.mockRejectedValueOnce({ statusCode, message });

  try {
    await searchBookings(mockBody);
  } catch (error) {
    expect(error).toEqual({ statusCode, message });
  }
});

it('throws if it receives an error when making request against an API', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = 'Error from API';

  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  request.call.mockRejectedValueOnce({ statusCode, message });

  try {
    await searchBookings(mockBody);
  } catch (error) {
    expect(error).toEqual({ statusCode, message });
  }
});

it('returns a successful response when receiving a successful response from an API', async () => {
  expect.assertions(1);

  const statusCode = 200;
  const data = { message: 'ok' };

  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  request.call.mockResolvedValueOnce({ statusCode, data });

  const response = await searchBookings(mockBody);

  expect(response.statusCode).toEqual(200);
});
