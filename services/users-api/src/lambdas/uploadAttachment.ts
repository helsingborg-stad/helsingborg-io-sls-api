import uuid from 'uuid';
import S3 from '../libs/S3';
import type { Token } from '../libs/token';
import { decodeToken } from '../libs/token';
import { wrappers } from '../libs/lambdaWrapper';

type SupportedMimeTypes = 'image/jpeg' | 'image/png' | 'image/jpg' | 'application/pdf';

export interface UploadAttachmentRequest {
  readonly mime: SupportedMimeTypes;
}

interface LambdaResponse {
  uploadUrl: string;
  id: string;
}

export interface Dependencies {
  decodeToken: (event: LambdaRequest) => Token;
  getUploadUrl: (key: string, mime: SupportedMimeTypes) => string;
  getUniqueId: () => string;
}

export interface LambdaRequest {
  readonly body: string;
  readonly headers?: {
    readonly Authorization?: string;
  };
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
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const { personalNumber } = dependencies.decodeToken(input);

  const { mime } = JSON.parse(input.body) as UploadAttachmentRequest;

  const uniqueUploadId = dependencies.getUniqueId();
  const fileStorageKeyName = `${personalNumber}/${uniqueUploadId}`;

  const uploadUrl = dependencies.getUploadUrl(fileStorageKeyName, mime);

  return {
    id: uniqueUploadId,
    uploadUrl,
  };
}

export const main = wrappers.restJSON.wrap(uploadAttachment, {
  decodeToken,
  getUploadUrl,
  getUniqueId: uuid.v4,
});
