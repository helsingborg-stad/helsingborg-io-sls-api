import { lambda, LambdaContext } from '../src/lambdas/uploadAttachment';

const abstractLambdaContext: LambdaContext = {
  decodeToken: () => ({
    personalNumber: 'my:decoded:token',
  }),
  getSignedUrl: () => Promise.resolve('my:signed:url'),
  getUniqueFileName: () => 'myfile_00000000-0000-0000-0000-000000000000.jpg',
};

const abstractAWSContext = {
  awsRequestId: 'my:request:id',
};

const abstractAWSEvent = {
  body: JSON.stringify({
    fileName: 'myfile.jpg',
    mime: 'image/jpeg',
  }),
  headers: {
    Authorization: 'Bearer 01234567890',
  },
};

test('successful request should return expected structure', async () => {
  const result = await lambda(abstractAWSEvent, abstractAWSContext, abstractLambdaContext);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({
    jsonapi: {
      version: '1.0',
    },
    data: {
      type: 'userAttachment',
      attributes: {
        uploadUrl: 'my:signed:url',
        fileName: 'myfile_00000000-0000-0000-0000-000000000000.jpg',
      },
    },
  });
});

test('event body missing should return status 400', async () => {
  const result = await lambda({}, abstractAWSContext, abstractLambdaContext);
  expect(result.statusCode).toBe(400);
});

test('fileName missing should return status 400', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        mime: 'image/jpg',
      }),
    },
    abstractAWSContext,
    abstractLambdaContext
  );

  expect(result.statusCode).toBe(400);
});

test('mimeType missing should return 400', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        fileName: 'myfile.jpg',
      }),
    },
    abstractAWSContext,
    abstractLambdaContext
  );

  expect(result.statusCode).toBe(400);
});

test('mimeType unknown should return 400', async () => {
  const result = await lambda(
    {
      body: JSON.stringify({
        fileName: 'myfile.jpg',
        mime: 'my/mime-type',
      }),
    },
    abstractAWSContext,
    abstractLambdaContext
  );

  expect(result.statusCode).toBe(400);
});

test('failure to retreive signed URL should return 400', async () => {
  const result = await lambda(abstractAWSEvent, abstractAWSContext, {
    ...abstractLambdaContext,
    getSignedUrl: () =>
      Promise.reject({
        status: 400,
      }),
  });

  expect(result.statusCode).toBe(400);
});

test('signed URL is called with the correct parameters', async () => {
  const getSignedUrl = jest.fn().mockResolvedValue('');

  await lambda(abstractAWSEvent, abstractAWSContext, {
    ...abstractLambdaContext,
    getSignedUrl,
  });

  expect(getSignedUrl).toHaveBeenCalledWith(
    undefined,
    expect.anything(),
    expect.objectContaining({
      ContentType: 'image/jpeg',
      Key: 'my:decoded:token/myfile_00000000-0000-0000-0000-000000000000.jpg',
    })
  );
});
