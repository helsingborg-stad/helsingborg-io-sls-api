import { getStatus } from '../../src/lambdas/getStatus';

import { VERSION_STATUS } from '../../src/helpers/constants';

import type { Dependencies, LambdaRequest } from '../../src/lambdas/getStatus';

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const mockJsonApi = { version: '1.0' };
const defaultUserAgent = 'MittHelsingborg/1.3.0/ios/15.0';
const mockUpdateUrl = 'some url';

function createDependencies(): Dependencies {
  return {
    getVersionConfigurations: () =>
      Promise.resolve({
        versions: {
          ios: {
            min: '1.0.0',
            max: '1.3.0',
            updateUrl: mockUpdateUrl,
          },
        },
      }),
  };
}

function createInput(userAgent = defaultUserAgent): LambdaRequest {
  return {
    headers: {
      'User-Agent': userAgent,
    },
  };
}

it('returns the version status successfully', async () => {
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: {
        type: 'getStatus',
        attributes: { status: VERSION_STATUS.OK, updateUrl: mockUpdateUrl },
      },
    }),
    headers: mockHeaders,
    statusCode: 200,
    isBase64Encoded: false,
  };

  const result = await getStatus(createInput(), createDependencies());

  expect(result).toEqual(expectedResult);
});

const malformedUserAgents = ['MittHelsingborg', '1.3.0/ios/15.0', 'MittHelsingborg/1.3.0/15.0'];
test.each(malformedUserAgents)('returns failure for`User-Agent` %s', async userAgent => {
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: mockJsonApi,
      data: { status: '400', code: '400', message: 'Malformed `User-Agent` header' },
    }),
    headers: mockHeaders,
    statusCode: 400,
    isBase64Encoded: false,
  };

  const result = await getStatus(createInput(userAgent), createDependencies());

  expect(result).toEqual(expectedResult);
});
