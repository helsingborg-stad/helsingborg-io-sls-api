import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import * as response from '../libs/response';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';
import S3 from '../libs/S3';

const BUCKET_NAME = process.env.BUCKET_NAME;

interface FileContent {
  Key: string;
  Size: number;
  LastModified: string;
}

interface GetUserFilesResponse {
  Contents: FileContent[] | null;
}

export interface Dependencies {
  decodeToken: (httpEvent: LambdaRequest) => { personalNumber: string };
  getUserFiles: (personalNumber: string) => Promise<FileContent[] | null>;
}

interface HttpHeaders {
  Authorization: string;
}

export interface LambdaRequest {
  headers: HttpHeaders;
}

async function getUserFiles(personalNumber: string): Promise<FileContent[] | null> {
  const files = (await S3.getFiles(BUCKET_NAME, `${personalNumber}/`)) as GetUserFilesResponse;

  return files?.Contents ?? null;
}

function removePersonalNumberPrefix(files: FileContent[], prefix: string) {
  const nonPrefixedFiles = files.filter(file => file.Key !== `${prefix}/`);
  return nonPrefixedFiles.map(file => ({
    s3key: file.Key,
    name: file.Key.substring(`${prefix}/`.length),
    sizeInBytes: file.Size,
    lastModifiedInMilliseconds: Date.parse(file.LastModified),
  }));
}

export async function getAttachmentList(input: LambdaRequest, dependencies: Dependencies) {
  const decodedToken = dependencies.decodeToken(input);
  const { personalNumber } = decodedToken;

  const files = await dependencies.getUserFiles(personalNumber);

  if (files === null) {
    log.writeError('Could not find files for user');
    return response.failure(new ResourceNotFoundError('No files found for user'));
  }

  const filesWithoutPrefix = removePersonalNumberPrefix(files, personalNumber);

  const totalFileSizeSumInBytes = filesWithoutPrefix.reduce(
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

export const main = log.wrap(event => {
  return getAttachmentList(event, {
    decodeToken,
    getUserFiles: getUserFiles,
  });
});
