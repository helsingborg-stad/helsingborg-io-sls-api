import { authorizer, Dependencies, LambdaRequest } from '../../src/lambdas/authorize';

const dependencies: Dependencies = {
  getSecret: () => Promise.resolve('my:secret:value'),
  verifyToken: () =>
    Promise.resolve({
      personalNumber: 'my:decoded:token',
    }),
};

const event: LambdaRequest = {
  authorizationToken: 'my:auth:token',
};

test('Expect to throw on missing authorizationCode', async () => {
  await expect(async () => {
    await authorizer({}, dependencies);
  }).rejects.toThrow();
});

test('Expect to throw on rejected token reader call', async () => {
  await expect(async () => {
    await authorizer(event, {
      ...dependencies,
      getSecret: () => {
        throw Error();
      },
    });
  }).rejects.toThrow();
});

test('Expect to throw on rejected token verification call', async () => {
  await expect(async () => {
    await authorizer(event, {
      ...dependencies,
      verifyToken: () => {
        throw Error();
      },
    });
  }).rejects.toThrow();
});

test('Expect to return an AWS Principal on successful request', async () => {
  const result = await authorizer(event, dependencies);
  expect(result).toStrictEqual({
    principalId: 'my:decoded:token',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: '*',
        },
      ],
    },
  });
});
