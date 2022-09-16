import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

import { deleteAttachment } from '../src/lambdas/deleteAttachment';

import * as response from '../src/libs/response';

import type { LambdaRequest, Dependencies } from '../src/lambdas/deleteAttachment';

const defaultPersonalNumber = '198002022222';
const defaultFilename = 'filename';

function createInput(partialInput: Partial<LambdaRequest> = {}): LambdaRequest {
  return {
    headers: {
      Authorization: defaultPersonalNumber,
    },
    pathParameters: {
      filename: defaultFilename,
    },
    ...partialInput,
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => ({ personalNumber: defaultPersonalNumber }),
    deleteFile: () => Promise.resolve(),
    ...partialDependencies,
  };
}

function createSuccessResponse() {
  return response.success(200, {
    type: 'userAttachment',
  });
}

function createUnsuccessResponse() {
  return response.failure(new BadRequestError('Missing filename in path query string'));
}

it('successfully deletes an attachment', async () => {
  const deleteFileMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await deleteAttachment(
    createInput(),
    createDependencies({
      deleteFile: deleteFileMock,
    })
  );

  expect(deleteFileMock).toHaveBeenCalledWith(`${defaultPersonalNumber}/${defaultFilename}`);
  expect(result).toEqual(createSuccessResponse());
});

it('returns failure if filename does not exist in pathparameters', async () => {
  const deleteFileMock = jest.fn();

  const result = await deleteAttachment(
    createInput({
      pathParameters: {
        filename: '',
      },
    }),
    createDependencies({
      deleteFile: deleteFileMock,
    })
  );

  expect(deleteFileMock).not.toHaveBeenCalled();
  expect(result).toEqual(createUnsuccessResponse());
});
