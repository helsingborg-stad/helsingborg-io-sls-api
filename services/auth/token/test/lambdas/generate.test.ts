import { lambda, LambdaContext } from '../../src/lambdas/generateToken';

const lambdaContext: LambdaContext = {
  getSecret: () => Promise.resolve('my:secret:value'),
  verifyToken: () =>
    Promise.resolve({
      personalNumber: '190001010101',
    }),
  signToken: () => Promise.resolve('my:signed:token'),
};

test('expect to fail with status 400 on missing event body', async () => {
  const result = await lambda(
    {
      body: '',
    },
    lambdaContext
  );
  expect(result.statusCode).toBe(400);
});

test('expect to fail with status 400 on invalid event body', async () => {
  const result = await lambda(
    {
      body: '{}',
    },
    lambdaContext
  );
  expect(result.statusCode).toBe(400);
});

test('expect to failt with 400 when body doesnt conform to schema', async () => {
  const result = await lambda(
    {
      body: '{ "abc": 123 }',
    },
    lambdaContext
  );
  expect(result.statusCode).toBe(400);
});

test('expect to fail with status 401 when token verification fails', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: 'xxxx.xxxx.xxxx',
        code: 'xxxx.xxxx.xxxx',
      }),
    },
    {
      ...lambdaContext,
      verifyToken: () => {
        throw Error('my:error:message');
      },
    }
  );
  expect(result.statusCode).toBe(401);
});

test('expect to fail with status 401 when sign token fails', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'xxxx.xxxx.xxxx',
      }),
    },
    {
      ...lambdaContext,
      signToken: () => {
        throw Error('my:error:message');
      },
    }
  );
  expect(result.statusCode).toBe(401);
});

test('expect status 200 when function succeeds', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'xxxx.xxxx.xxxx',
      }),
    },
    lambdaContext
  );
  const response = JSON.parse(result.body);

  expect(result.statusCode).toBe(200);
  expect(response).toStrictEqual({
    jsonapi: {
      version: '1.0',
    },
    data: {
      type: 'authorizationToken',
      attributes: {
        accessToken: 'my:signed:token',
        refreshToken: 'my:signed:token',
      },
    },
  });
});
