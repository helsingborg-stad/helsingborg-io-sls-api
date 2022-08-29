import { main } from '../../src/lambdas/get';

const oldEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...oldEnvironment };
});

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const mockJsonApi = { version: '1.0' };

it('returns the value in `message` environment variable', async () => {
  const expectedMessageValue = 'My funky environment message value';
  process.env.message = expectedMessageValue;

  const epectedResult = {
    statusCode: 200,
    headers: mockHeaders,
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: {
        message: expectedMessageValue,
      },
    }),
    isBase64Encoded: false,
  };

  const result = await main();

  expect(result).toEqual(epectedResult);
});

it('returns an empty string if `message` variable is not set', async () => {
  const expectedResult = {
    statusCode: 200,
    headers: mockHeaders,
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: {
        message: '',
      },
    }),
    isBase64Encoded: false,
  };

  const result = await main();

  expect(result).toEqual(expectedResult);
});
