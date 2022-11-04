import { wrappers } from '../libs/lambdaWrapper';
import { decodeToken } from '../libs/token';
import S3 from '../libs/S3';

const BUCKET_NAME = process.env.BUCKET_NAME;

interface HttpHeaders {
  Authorization: string;
}

interface PathParameters {
  filename: string;
}

interface LambdaResponse {
  fileUrl: string | undefined;
}

export interface LambdaRequest {
  headers: HttpHeaders;
  pathParameters: PathParameters;
}

export interface Dependencies {
  decodeToken: (httpEvent: LambdaRequest) => { personalNumber: string };
  getFileUrl: (key: string) => string | undefined;
}

function getFileUrl(key: string): string | undefined {
  return S3.getSignedUrl(BUCKET_NAME, 'getObject', {
    Key: key,
    Expires: 60 * 5,
  });
}

export async function getAttachment(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const { personalNumber } = dependencies.decodeToken(input);
  const { filename } = input.pathParameters;

  const key = `${personalNumber}/${filename}`;

  const fileUrl = dependencies.getFileUrl(key);

  return {
    fileUrl,
  };
}

export const main = wrappers.restJSON.wrap(getAttachment, {
  decodeToken,
  getFileUrl,
});
