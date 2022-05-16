import { login, Dependencies } from '../../src/lambdas/login';

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
      redirectUrl: '<redirectUrl>',
      sessionId: '<sessionId>',
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
  const result = await login(
    {
      body: JSON.stringify({}),
    },
    {
      ...dependencies,
      httpsRequest: () => {
        throw {
          status: 502,
          message: '<message>',
        };
      },
    }
  );
  expect(result.statusCode).toBe(400);
});

it('should return a redirectUrl', async () => {
  let data;

  await login(
    {
      body: JSON.stringify({
        callbackUrl: '<callbackUrl>',
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
    redirectUrl: '<redirectUrl>',
  });
});
