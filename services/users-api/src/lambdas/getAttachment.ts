import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import * as response from '../libs/response';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';
import S3 from '../libs/S3';

const BUCKET_NAME = process.env.BUCKET_NAME;

interface GetFileResponse {
  Body: Buffer;
  ContentType: string;
}

export interface Dependencies {
  decodeToken: (httpEvent: LambdaRequest) => { personalNumber: string };
  getFile: (key: string) => Promise<GetFileResponse | null>;
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

function getFile(key: string): Promise<GetFileResponse | null> {
  return S3.getFile(BUCKET_NAME, key);
}

export async function getAttachment(input: LambdaRequest, dependencies: Dependencies) {
  const { personalNumber } = dependencies.decodeToken(input);
  const { filename } = input.pathParameters;

  const file = await dependencies.getFile(`${personalNumber}/${filename}`);

  if (file === null) {
    log.writeError('Could not get file for user');

    return response.failure(new ResourceNotFoundError('No file found for user'));
  }

  const buffer = Buffer.from(file.Body);

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': file.ContentType,
    },
    body: buffer.toString('base64'),
  };
}

export const main = log.wrap(event => {
  return getAttachment(event, {
    decodeToken,
    getFile,
  });
});
