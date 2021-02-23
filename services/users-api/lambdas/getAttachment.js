import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import S3 from '../../../libs/S3';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';

const BUCKET_NAME = process.env.BUCKET_NAME;

export async function main(event) {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken;
  const { filename } = event.pathParameters;

  const [getFileError, file] = await to(getFileFromUserS3Bucket(`${personalNumber}/${filename}`));
  if (getFileError) {
    return response.failure(getFileError);
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

async function getFileFromUserS3Bucket(key) {
  const [getFileError, file] = await to(S3.getFile(BUCKET_NAME, key));
  if (getFileError) {
    throwError(getFileError.statusCode, getFileError.message);
  }

  return file;
}
