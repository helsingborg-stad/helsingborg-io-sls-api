import { getSsmParameters } from '../../helpers/getSsmParameters';
import params from '../../../../libs/params';
import config from '../../../../config';

jest.mock('../../../../libs/params');

const mockEndpoint = 'https://mockEndpoint.se';
const mockApiKey = '1235';

process.env.stage = 'dev';

beforeEach(() => {
  jest.resetAllMocks();
});

it('throws if failing fetching parameterstore values', async () => {
  expect.assertions(1);
  params.read.mockRejectedValueOnce(new Error({ statusCode: 200, message: 'error' }));

  await expect(getSsmParameters()).rejects.toThrow();
});

it('return parameterstore values successfully', async () => {
  expect.assertions(2);
  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });

  const result = await getSsmParameters();

  expect(result).toEqual({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  expect(params.read).toHaveBeenCalledWith(config.booking.envsKeyName);
});

it('returns the cached values', async () => {
  expect.assertions(2);
  params.read.mockResolvedValueOnce({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });

  const result = await getSsmParameters();

  expect(result).toEqual({ outlookBookingEndpoint: mockEndpoint, apiKey: mockApiKey });
  expect(params.read).toHaveBeenCalledTimes(0);
});
