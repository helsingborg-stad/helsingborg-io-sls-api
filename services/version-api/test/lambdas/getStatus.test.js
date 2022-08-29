import { main } from '../../src/lambdas/getStatus';

import { getVersionConfigurations } from '../../src/helpers/getVersionConfigurations';

import { VERSION_STATUS } from '../../src/helpers/constants';

jest.mock('../../src/helpers/getVersionConfigurations');

getVersionConfigurations.mockResolvedValue({
  versions: {
    ios: {
      min: '1.0.0',
      max: '1.3.0',
      updateUrl: 'Some url',
    },
  },
});

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const mockJsonApi = { version: '1.0' };
const mockContext = { awsRequestId: '123' };

let mockEvent;
beforeEach(() => {
  mockEvent = {
    headers: {
      'User-Agent': 'MittHelsingborg/1.3.0/ios/15.0',
    },
    isBase64Encoded: false,
  };
});

it('returns the version status successfully', async () => {
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: { type: 'getStatus', attributes: { status: VERSION_STATUS.OK, updateUrl: 'Some url' } },
    }),
    headers: mockHeaders,
    statusCode: 200,
    isBase64Encoded: false,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
});

const malformedUserAgents = ['MittHelsingborg', '1.3.0/ios/15.0', 'MittHelsingborg/1.3.0/15.0'];
test.each(malformedUserAgents)('returns failure for`User-Agent` %s', async userAgent => {
  mockEvent.headers['User-Agent'] = userAgent;

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: { status: '400', code: '400', message: 'Malformed `User-Agent` header' },
    }),
    headers: mockHeaders,
    statusCode: 400,
    isBase64Encoded: false,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
});
