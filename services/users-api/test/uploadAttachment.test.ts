import type { Dependencies, LambdaRequest } from '../src/lambdas/uploadAttachment';
import { uploadAttachment } from '../src/lambdas/uploadAttachment';

const defaultUploadUrl = 'https://example.com';
const defaultPersonalNumber = '199707077777';
const defaultMime = 'image/jpeg';
const defaultUniqueId = 'UNIQUE_ID';

function createDependencies(partialDependencies: Partial<Dependencies> = {}) {
  return {
    getUniqueId: () => defaultUniqueId,
    decodeToken: jest.fn().mockReturnValue({
      personalNumber: defaultPersonalNumber,
    }),
    getUploadUrl: jest.fn().mockReturnValue(defaultUploadUrl),
    ...partialDependencies,
  };
}

function createInput(): LambdaRequest {
  return {
    body: JSON.stringify({
      mime: defaultMime,
    }),
    headers: {
      Authorization: 'Bearer 01234567890',
    },
  };
}

it('successful request should return expected structure', async () => {
  const getUploadUrlMock = jest.fn().mockReturnValueOnce(defaultUploadUrl);

  const result = await uploadAttachment(
    createInput(),
    createDependencies({
      getUploadUrl: getUploadUrlMock,
    })
  );

  expect(result).toEqual(
    expect.objectContaining({
      uploadUrl: defaultUploadUrl,
      id: defaultUniqueId,
    })
  );
  expect(getUploadUrlMock).toHaveBeenCalledWith(
    expect.stringContaining(defaultPersonalNumber),
    defaultMime
  );
});
