import { session, Dependencies } from '../../src/lambdas/session';

const dependencies: Dependencies = {
  readParams: <T>() => {
    return Promise.resolve({
      customerKey: '<customerKey>',
      serviceKey: '<serviceKey>',
      baseUrl: '<baseUrl>',
    } as unknown as T);
  },
  httpsRequest: <T>() => {
    return Promise.resolve({
      sessionId: '<newSessionId>',
      userAttributes: {
        serialNumber: '<serialNumber>',
      },
    } as unknown as T);
  },
  createResponse: (statusCode, body) => ({
    statusCode,
    body,
    headers: {
      'Access-Control-Allow-Origin': '',
      'Access-Control-Allow-Credentials': true,
    },
  }),
  readSecrets: () => Promise.resolve('<secret>'),
  getExpireDate: () => 10,
  signToken: () => Promise.resolve('<signedToken>'),
};

it('should return a valid response', async () => {
  let data;

  await session(
    {
      body: JSON.stringify({
        sessionId: '<sessionId>',
      }),
    },
    {
      ...dependencies,
      createResponse: (statusCode, body) => {
        data = body;
        return dependencies.createResponse(statusCode, body);
      },
    }
  );
  expect(data).toEqual({
    timestamp: 10,
    sessionToken: '<signedToken>',
  });
});
