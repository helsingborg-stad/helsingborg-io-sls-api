// eslint-disable-next-line @typescript-eslint/no-var-requires
const { InternalServerError } = require('@helsingborg-stad/npm-api-error-handling/src/errors');

import booking from '../../src/helpers/booking';
import { CreateBookingRequestBody } from '../../src/helpers/types';
import params from '../../src/libs/params';
import * as request from '../../src/libs/request';

jest.mock('../../src/libs/params');
jest.mock('../../src/libs/request');

const mockEndpoint = 'https://mockEndpoint.se';
const mockApiKey = '1235';

const { read } = jest.mocked(params);
const { call } = jest.mocked(request);

process.env.stage = 'dev';

beforeEach(() => {
  jest.resetAllMocks();
});

it('throws if failing fetching SSM parameters', async () => {
  expect.assertions(1);

  read.mockRejectedValueOnce({});

  try {
    await booking.get(undefined);
  } catch (error) {
    // eslint-disable-next-line jest/no-conditional-expect
    expect(error).toBeInstanceOf(InternalServerError);
  }
});

it('throws if failing making sendBookingPostRequest requests', async () => {
  expect.assertions(1);

  const status = 500;
  const statusText = 'sendBookingPostRequest error';

  read.mockResolvedValueOnce({
    datatorgetEndpoint: mockEndpoint,
    apiKey: mockApiKey,
  });
  call.mockRejectedValueOnce({ response: { status, statusText } });

  try {
    await booking.get(undefined);
  } catch (error) {
    // eslint-disable-next-line jest/no-conditional-expect
    expect(error).toEqual({ status, message: statusText });
  }
});

test.each([
  {
    bookingRequest: booking.create,
    uriPath: 'create',
    functionCall: { requiredAttendees: ['mock'], startTime: '1', endTime: '2' },
    requestCall: { requiredAttendees: ['mock'], startTime: '1', endTime: '2' },
  },
  {
    bookingRequest: booking.cancel,
    uriPath: 'cancel',
    functionCall: 'mockId',
    requestCall: { bookingId: 'mockId' },
  },
  {
    bookingRequest: booking.get,
    uriPath: 'get',
    functionCall: 'mockId',
    requestCall: { bookingId: 'mockId' },
  },
  {
    bookingRequest: booking.search,
    uriPath: 'search',
    functionCall: { startTime: '1', endTime: '2', referenceCode: '3' },
    requestCall: { startTime: '1', endTime: '2', referenceCode: '3' },
  },
  {
    bookingRequest: booking.getHistoricalAttendees,
    uriPath: 'getHistoricalAttendees',
    functionCall: { startTime: '1', endTime: '2', referenceCode: '3' },
    requestCall: { startTime: '1', endTime: '2', referenceCode: '3' },
  },
])(
  `booking $uriPath makes requests against correct endpoint`,
  async ({ bookingRequest, uriPath, functionCall, requestCall }) => {
    expect.assertions(1);

    const endpoint = `${mockEndpoint}/booking/${uriPath}`;
    const requestClient = request.requestClient(
      { rejectUnauthorized: false },
      { 'X-ApiKey': mockApiKey }
    );

    read.mockResolvedValueOnce({
      datatorgetEndpoint: mockEndpoint,
      apiKey: mockApiKey,
    });
    call.mockResolvedValueOnce(undefined);

    await bookingRequest(functionCall as CreateBookingRequestBody & string);

    expect(request.call).toHaveBeenCalledWith(requestClient, 'post', endpoint, requestCall);
  }
);
