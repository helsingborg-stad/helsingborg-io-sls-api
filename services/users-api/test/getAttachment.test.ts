import { getAttachment } from '../src/lambdas/getAttachment';

import type { FunctionInput, Dependencies } from '../src/lambdas/getAttachment';

const defaultPersonalNumber = '197001011234';
const defaultFileUrl = 'https://example.com';
const defaultFilename = 'file';

function createInput(): FunctionInput {
  return {
    personalNumber: defaultPersonalNumber,
    filename: defaultFilename,
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => ({ personalNumber: defaultPersonalNumber }),
    getFileUrl: () => defaultFileUrl,
    ...partialDependencies,
  };
}

it('succesfully fetches file url for user', async () => {
  const getFileUrlMock = jest.fn().mockReturnValue(defaultFileUrl);

  const result = await getAttachment(
    createInput(),
    createDependencies({
      getFileUrl: getFileUrlMock,
    })
  );

  expect(getFileUrlMock).toHaveBeenCalledWith(`${defaultPersonalNumber}/${defaultFilename}`);
  expect(result).toEqual({
    fileUrl: defaultFileUrl,
  });
});
