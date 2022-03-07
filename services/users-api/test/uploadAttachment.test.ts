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

it('Successful Request', async () => {
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

it('Event body is missing', async () => {
  const result = await lambda({}, abstractAWSContext, abstractLambdaContext);
  expect(result.statusCode).toBe(400);
});

it('FileName is missing in request payload', async () => {
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

it('MimeType is missing in request payload', async () => {
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

it('MimeType is unknown in request payload', async () => {
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

it('FAILED to retreive signed URL', async () => {
  const result = await lambda(abstractAWSEvent, abstractAWSContext, {
    ...abstractLambdaContext,
    getSignedUrl: () =>
      Promise.reject({
        status: 400,
      }),
  });
  expect(result.statusCode).toBe(400);
});
