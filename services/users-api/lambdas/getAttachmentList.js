/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import S3 from '../../../libs/S3';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';

const BUCKET_NAME = process.env.BUCKET_NAME;

export async function main(event) {
  const decodedToken = decodeToken(event);
  const { personalNumber } = decodedToken;

  const [getFilesError, s3Files] = await to(getFilesFromUserS3Bucket(personalNumber));
  if (getFilesError) {
    return response.failure(getFilesError);
  }

  const files = getUserFilesWithoutPrefix(s3Files, personalNumber);

  const totalFileSizeSumInBytes = files.reduce(
    (fileSizeSum, file) => fileSizeSum + file.sizeInBytes,
    0
  );

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      files,
      totalFileSizeSumInBytes,
    },
  });
}

async function getFilesFromUserS3Bucket(personalNumber) {
  const [getFilesError, s3Files] = await to(S3.getFiles(BUCKET_NAME, `${personalNumber}/`));
  if (getFilesError) {
    throwError(getFilesError.statusCode, getFilesError.message);
  }

  return s3Files;
}

function getUserFilesWithoutPrefix(s3Files, prefix) {
  return s3Files.Contents.filter(file => file.Key !== `${prefix}/`).map(file => ({
    s3key: file.Key,
    name: file.Key.substring(`${prefix}/`.length),
    sizeInBytes: file.Size,
    lastModifiedInMilliseconds: Date.parse(file.LastModified),
  }));
}
