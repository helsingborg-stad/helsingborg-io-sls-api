import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import { getAttachment } from '../src/lambdas/getAttachment';

import * as response from '../src/libs/response';

import type { LambdaRequest, Dependencies } from '../src/lambdas/getAttachment';

const defaultPersonalNumber = '197001011234';
const defaultFilename = 'file';

function createInput(): LambdaRequest {
  return {
    headers: {
      Authorization: defaultPersonalNumber,
    },
    pathParameters: {
      filename: defaultFilename,
    },
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => ({ personalNumber: defaultPersonalNumber }),
    getFile: () => Promise.resolve({ Body: Buffer.alloc(1), ContentType: 'file' }),
    ...partialDependencies,
  };
}

function createHttpSuccessResponse(buffer: Buffer) {
  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'file',
    },
    body: buffer.toString('base64'),
  };
}

function createHttpFilesNotFoundResponse() {
  return response.failure(new ResourceNotFoundError('No file found for user'));
}

it('succesfully fetches file for user', async () => {
  const buffer = Buffer.alloc(1);
  const getFileMock = jest.fn().mockResolvedValueOnce({
    Body: buffer,
    ContentType: 'file',
  });

  const result = await getAttachment(
    createInput(),
    createDependencies({
      getFile: getFileMock,
    })
  );

  expect(getFileMock).toHaveBeenCalledWith(`${defaultPersonalNumber}/${defaultFilename}`);
  expect(result).toEqual(createHttpSuccessResponse(buffer));
});

it('returns failure if no file is found', async () => {
  const getFileMock = jest.fn().mockResolvedValueOnce(null);

  const result = await getAttachment(
    createInput(),
    createDependencies({
      getFile: getFileMock,
    })
  );

  expect(getFileMock).toHaveBeenCalledWith(`${defaultPersonalNumber}/${defaultFilename}`);
  expect(result).toEqual(createHttpFilesNotFoundResponse());
});
