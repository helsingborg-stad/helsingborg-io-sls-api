import { InternalServerError } from '@helsingborg-stad/npm-api-error-handling/src/errors';

import booking from '../../helpers/booking';
import params from '../../../../libs/params';
import * as request from '../../../../libs/request';

jest.mock('../../../../libs/params');
jest.mock('../../../../libs/request');

const mockEndpoint = 'https://mockEndpoint.se';
const mockApiKey = '1235';
const mockBody = { id: 'testID' };

process.env.stage = 'dev';

beforeEach(() => {
  jest.resetAllMocks();
});

it('throws if failing fetching SSM parameters', async () => {
  expect.assertions(1);

  params.read.mockRejectedValueOnce({});

  try {
    await booking.get(mockBody);
  } catch (error) {
    expect(error).toBeInstanceOf(InternalServerError);
  }
});

it('throws if failing making sendBookingPostRequest requests', async () => {
  expect.assertions(1);

  const status = 500;
  const statusText = 'sendBookingPostRequest error';

  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  request.call.mockRejectedValueOnce({ response: { status, statusText } });

  try {
    await booking.get(mockBody);
  } catch (error) {
    expect(error).toEqual({ status, message: statusText });
  }
});

test.each(['create', 'cancel', 'get'])(
  `booking.%s makes requests against correct endpoint`,
  async requestName => {
    expect.assertions(1);

    const endpoint = `${mockEndpoint}/${requestName}`;
    const requestParameter = requestName === 'create' ? { bookingId: requestName } : requestName;
    const body = { bookingId: requestName };
    const requestClient = request.requestClient(
      { rejectUnauthorized: false },
      { 'X-ApiKey': mockApiKey }
    );

    params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
    request.call.mockResolvedValueOnce();

    await booking[requestName](requestParameter);

    expect(request.call).toHaveBeenCalledWith(requestClient, 'post', endpoint, body);
  }
);
