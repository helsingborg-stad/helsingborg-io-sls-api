import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

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

  const statusCode = 500;
  const message = messages[statusCode];

  params.read.mockRejectedValueOnce({ statusCode, message });

  try {
    await booking.get(mockBody);
  } catch (error) {
    expect(error).toEqual({ statusCode, message });
  }
});

it('throws if failing making sendBookingPostRequest requests', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = 'sendBookingPostRequest error';

  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  request.call.mockRejectedValueOnce({ statusCode, message });

  try {
    await booking.get(mockBody);
  } catch (error) {
    expect(error).toEqual({ statusCode, message });
  }
});

test.each(['create', 'cancel', 'get'])(
  `booking.%s makes requests against correct endpoint`,
  async requestName => {
    expect.assertions(1);

    const endpoint = `${mockEndpoint}/${requestName}`;
    const body = { id: requestName };
    const requestClient = request.requestClient(
      { rejectUnauthorized: false },
      { 'X-ApiKey': mockApiKey }
    );

    params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
    request.call.mockResolvedValueOnce();

    await booking[requestName](body);

    expect(request.call).toHaveBeenCalledWith(requestClient, 'post', endpoint, body);
  }
);
