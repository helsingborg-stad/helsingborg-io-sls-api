import uuid from 'uuid';
import S3 from '../libs/S3';
import { wrappers } from '../libs/lambdaWrapper';

type SupportedMimeTypes = 'image/jpeg' | 'image/png' | 'image/jpg' | 'application/pdf';

interface FunctionResponse {
  uploadUrl: string;
  id: string;
}

export interface Dependencies {
  getUploadUrl: (key: string, mime: SupportedMimeTypes) => string;
  getUniqueId: () => string;
}

export interface FunctionInput {
  mime: SupportedMimeTypes;
  personalNumber: string;
}

function getUploadUrl(key: string, mime: SupportedMimeTypes): string {
  const { BUCKET_NAME = '' } = process.env;

  return S3.getSignedUrl(BUCKET_NAME, 'putObject', {
    ContentType: mime,
    ACL: 'public-read',
    Key: key,
    Expires: 60 * 5,
  });
}

export async function uploadAttachment(
  input: FunctionInput,
  dependencies: Dependencies
): Promise<FunctionResponse> {
  const uniqueUploadId = dependencies.getUniqueId();
  const fileStorageKeyName = `${input.personalNumber}/${uniqueUploadId}`;

  const uploadUrl = dependencies.getUploadUrl(fileStorageKeyName, input.mime);

  return {
    id: uniqueUploadId,
    uploadUrl,
  };
}

export const main = wrappers.restJSON.wrap(uploadAttachment, {
  getUploadUrl,
  getUniqueId: uuid.v4,
});
