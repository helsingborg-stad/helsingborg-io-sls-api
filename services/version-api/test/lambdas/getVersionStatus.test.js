import { main } from '../../lambdas/getVersionStatus';
import { getVersionConfigurations } from '../../helpers/getVersionConfigurations';

import { VERSION_STATUS } from '../../constants';

jest.mock('../../helpers/getVersionConfigurations');

getVersionConfigurations.mockResolvedValue({
  versions: {
    ios: {
      min: '1.0.0',
      max: '1.3.0',
    },
  },
});

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const mockJsonApi = { version: '1.0' };

let mockEvent;
beforeEach(() => {
  mockEvent = {
    headers: {
      'User-Agent': 'MittHelsingborg/1.3.0/ios/15.0',
    },
  };
});

it('returns the version status successfully', async () => {
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: { versionStatus: VERSION_STATUS.OK },
    }),
    headers: mockHeaders,
    statusCode: 200,
  };

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

const malformedUserAgents = ['MittHelsingborg', '1.3.0/ios/15.0', 'MittHelsingborg/1.3.0/15.0'];
test.each(malformedUserAgents)('returns failure for`User-Agent` %s', async userAgent => {
  mockEvent.headers['User-Agent'] = userAgent;

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: { status: '500', code: '500', message: 'Malformed `User-Agent` header' },
    }),
    headers: mockHeaders,
    statusCode: 500,
  };

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});
