import { uploadAttachment, Dependencies } from '../src/lambdas/uploadAttachment';

const dependencies: Dependencies = {
  decodeToken: () => ({
    personalNumber: 'my:decoded:token',
  }),
  getSignedUrl: () => 'my:signed:url',
  createUniqueFileName: () => 'myfile_00000000-0000-0000-0000-000000000000.jpg',
};

const mockInput = {
  body: JSON.stringify({
    fileName: 'myfile.jpg',
    mime: 'image/jpeg',
  }),
  headers: {
    Authorization: 'Bearer 01234567890',
  },
};

test('successful request should return expected structure', async () => {
  const result = await uploadAttachment(mockInput, dependencies);

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
  const result = await uploadAttachment({}, dependencies);
  expect(result.statusCode).toBe(400);
});

test('fileName missing should return status 400', async () => {
  const result = await uploadAttachment(
    {
      body: JSON.stringify({
        mime: 'image/jpg',
      }),
    },
    dependencies
  );

  expect(result.statusCode).toBe(400);
});

test('mimeType missing should return 400', async () => {
  const result = await uploadAttachment(
    {
      body: JSON.stringify({
        fileName: 'myfile.jpg',
      }),
    },
    dependencies
  );

  expect(result.statusCode).toBe(400);
});

test('mimeType unknown should return 400', async () => {
  const result = await uploadAttachment(
    {
      body: JSON.stringify({
        fileName: 'myfile.jpg',
        mime: 'my/mime-type',
      }),
    },
    dependencies
  );

  expect(result.statusCode).toBe(400);
});

test('failure to retreive signed URL should return 400', async () => {
  const result = await uploadAttachment(mockInput, {
    ...dependencies,
    getSignedUrl: () => undefined,
  });

  expect(result.statusCode).toBe(400);
});

test('signed URL is called with the correct parameters', async () => {
  const getSignedUrl = jest.fn().mockResolvedValue('');

  await uploadAttachment(mockInput, {
    ...dependencies,
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
