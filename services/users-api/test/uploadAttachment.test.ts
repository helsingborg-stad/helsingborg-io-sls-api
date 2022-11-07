import type { Dependencies, FunctionInput } from '../src/lambdas/uploadAttachment';
import { uploadAttachment } from '../src/lambdas/uploadAttachment';

const defaultUploadUrl = 'https://example.com';
const defaultPersonalNumber = '199707077777';
const defaultMime = 'image/jpeg';
const defaultUniqueId = 'UNIQUE_ID';

function createDependencies(partialDependencies: Partial<Dependencies> = {}) {
  return {
    getUniqueId: () => defaultUniqueId,
    getUploadUrl: jest.fn().mockReturnValue(defaultUploadUrl),
    ...partialDependencies,
  };
}

function createInput(): FunctionInput {
  return {
    mime: defaultMime,
    personalNumber: defaultPersonalNumber,
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
