import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import { getAttachmentList } from '../src/lambdas/getAttachmentList';

import * as response from '../src/libs/response';

import type { LambdaRequest, Dependencies } from '../src/lambdas/getAttachmentList';

const defaultPersonalNumber = '2022010112345';

function createInput(): LambdaRequest {
  return {
    headers: {
      Authorization: 'my authorization',
    },
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => ({ personalNumber: defaultPersonalNumber }),
    getUserFiles: () => Promise.resolve([]),
    ...partialDependencies,
  };
}

function createFile(Key: string, Size: number, LastModified: number) {
  return {
    Key,
    Size,
    LastModified,
  };
}

function createHttpSuccessResponse(files: unknown, totalSize: number) {
  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      files,
      totalFileSizeSumInBytes: totalSize,
    },
  });
}

function createHttpFilesNotFoundResponse() {
  return response.failure(new ResourceNotFoundError('No files found for user'));
}

it('successfully returns user files', async () => {
  const testFiles = [createFile('key1', 1, 1), createFile('key2', 2, 2)];
  const getUserFilesMock = jest.fn().mockResolvedValueOnce(testFiles);

  const result = await getAttachmentList(
    createInput(),
    createDependencies({
      getUserFiles: getUserFilesMock,
    })
  );

  expect(getUserFilesMock).toHaveBeenCalledWith(defaultPersonalNumber);
  expect(result).toEqual(createHttpSuccessResponse(testFiles, 3));
});

it('returns failure if no user files were found', async () => {
  const getUserFilesMock = jest.fn().mockResolvedValueOnce(null);

  const result = await getAttachmentList(
    createInput(),
    createDependencies({
      getUserFiles: getUserFilesMock,
    })
  );

  expect(getUserFilesMock).toHaveBeenCalledWith(defaultPersonalNumber);
  expect(result).toEqual(createHttpFilesNotFoundResponse());
});
