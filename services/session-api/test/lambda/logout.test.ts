import { logout, Dependencies } from '../../src/lambdas/logout';

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
      sessiondeleted: '<sessionDeleted>',
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
};
it('should throw on invalid payload', async () => {
  const result = await logout(
    {
      body: JSON.stringify({}),
    },
    dependencies
  );
  expect(result.statusCode).toBe(400);
});

it('should return a sessionDeleted', async () => {
  await logout(
    {
      body: JSON.stringify({
        sessionId: '<sessionId>',
      }),
    },
    {
      ...dependencies,
      createResponse: (statusCode, body) => {
        expect(body).toEqual({
          sessionDeleted: '<sessionDeleted>',
        });
        return dependencies.createResponse(statusCode, body);
      },
    }
  );
});
