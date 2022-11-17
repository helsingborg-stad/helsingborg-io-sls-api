import { wrappers } from '../libs/lambdaWrapper';
import { decodeToken } from '../libs/token';
import S3 from '../libs/S3';

const BUCKET_NAME = process.env.BUCKET_NAME;

interface FunctionResponse {
  fileUrl: string | undefined;
}

export interface FunctionInput {
  personalNumber: string;
  filename: string;
}

export interface Dependencies {
  decodeToken: (httpEvent: FunctionInput) => { personalNumber: string };
  getFileUrl: (key: string) => string | undefined;
}

function getFileUrl(key: string): string | undefined {
  return S3.getSignedUrl(BUCKET_NAME, 'getObject', {
    Key: key,
    Expires: 60 * 5,
  });
}

export async function getAttachment(
  input: FunctionInput,
  dependencies: Dependencies
): Promise<FunctionResponse> {
  const { personalNumber, filename } = input;

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
