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
      redirectUrl: '<https://redirect.se>',
      sessionId: '<1234567890>',
    } as unknown as T);
  },
};
it('should throw on invalid payload', async () => {
  const result = await login(
    {
      body: JSON.stringify({}),
    },
    dependencies
  );
  expect(result.statusCode).toBe(400);
});
