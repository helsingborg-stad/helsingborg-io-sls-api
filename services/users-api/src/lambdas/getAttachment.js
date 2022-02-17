import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import S3 from '../libs/S3';
import * as response from '../libs/response';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';

const BUCKET_NAME = process.env.BUCKET_NAME;

export async function main(event, context) {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken;
  const { filename } = event.pathParameters;

  const [getFileError, userS3File] = await to(
    getFileFromUserS3Bucket(`${personalNumber}/${filename}`)
  );
  if (getFileError) {
    log.error(
      'Get file error',
      context.awsRequestId,
      'service-users-api-getAttachment-001',
      getFileError
    );

    return response.failure(getFileError);
  }

  const buffer = Buffer.from(userS3File.Body);

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': userS3File.ContentType,
    },
    body: buffer.toString('base64'),
  };
}

async function getFileFromUserS3Bucket(s3Key) {
  const [getS3FileError, s3File] = await to(S3.getFile(BUCKET_NAME, s3Key));
  if (getS3FileError) {
    throwError(getS3FileError.statusCode, getS3FileError.message);
  }

  return s3File;
}
