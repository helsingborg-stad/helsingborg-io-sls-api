import { lambda, LambdaContext, LambdaEvent } from '../../src/lambdas/authorize';

/**
 * Create an abstraction of the context object
 */

const lambdaContext: LambdaContext = {
  getSecret: () => Promise.resolve('my:secret:value'),
  verifyToken: () =>
    Promise.resolve({
      personalNumber: 'my:decoded:token',
    }),
};

/**
 * Create an abstraction of the event object
 */
const eventObject: LambdaEvent = {
  authorizationToken: 'my:auth:token',
};

test('Expect to throw on missing authorizationCode', async () => {
  await expect(async () => {
    await lambda({}, lambdaContext);
  }).rejects.toThrow();
});

test('Expect to throw on rejected token reader call', async () => {
  await expect(async () => {
    await lambda(eventObject, {
      ...lambdaContext,
      getSecret: () => {
        throw Error();
      },
    });
  }).rejects.toThrow();
});

test('Expect to throw on rejected token verification call', async () => {
  await expect(async () => {
    await lambda(eventObject, {
      ...lambdaContext,
      verifyToken: () => {
        throw Error();
      },
    });
  }).rejects.toThrow();
});

test('Expect to return an AWS Principal on successful request', async () => {
  const result = await lambda(eventObject, lambdaContext);
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
