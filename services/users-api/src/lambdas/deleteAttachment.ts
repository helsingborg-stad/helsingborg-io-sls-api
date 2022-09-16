import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

import * as response from '../libs/response';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';
import S3 from '../libs/S3';

const BUCKET_NAME = process.env.BUCKET_NAME;

export interface Dependencies {
  decodeToken: (httpEvent: LambdaRequest) => { personalNumber: string };
  deleteFile: (key: string) => Promise<void>;
}

interface HttpHeaders {
  Authorization: string;
}

interface PathParameters {
  filename: string;
}

export interface LambdaRequest {
  headers: HttpHeaders;
  pathParameters: PathParameters;
}

function deleteFile(fileKey: string): Promise<void> {
  return S3.deleteFile(BUCKET_NAME, fileKey);
}

export async function deleteAttachment(input: LambdaRequest, dependencies: Dependencies) {
  const { filename } = input.pathParameters;
  if (!filename) {
    return response.failure(new BadRequestError('Missing filename in path query string'));
  }

  const decodedToken = dependencies.decodeToken(input);
  const { personalNumber } = decodedToken;

  const fileKey = `${personalNumber}/${filename}`;
  await dependencies.deleteFile(fileKey);

  return response.success(200, {
    type: 'userAttachment',
  });
}

export const main = log.wrap(event => {
  return deleteAttachment(event, {
    decodeToken,
    deleteFile,
  });
});
