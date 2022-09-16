import uuid from 'uuid';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import S3 from '../libs/S3';
import log from '../libs/logs';
import * as response from '../libs/response';
import { decodeToken, Token } from '../libs/token';
import { getUniqueFileName } from '../helpers/files';

export interface UploadAttachmentRequest {
  readonly fileName?: string;
  readonly mime?: string;
}

interface SignedUrlParameters {
  ContentType: string;
  ACL: string;
  Key: string;
  Expires: number;
}

export interface Dependencies {
  decodeToken: (event: LambdaRequest) => Token;
  getSignedUrl: (
    bucketName?: string,
    method?: string,
    params?: SignedUrlParameters
  ) => string | undefined;
  createUniqueFileName: (file: string, separator: string, uuidGenerator: () => string) => string;
}

export interface LambdaRequest {
  readonly body?: string;
  readonly headers?: {
    readonly Authorization?: string;
  };
}

const allowedFileType = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

export async function uploadAttachment(input: LambdaRequest, dependencies: Dependencies) {
  const decodedToken = dependencies.decodeToken(input);

  if (!input?.body) {
    const errorMessage = 'Body data is missing in request';
    log.writeError(`service-users-api-uploadAttachment-000: ${errorMessage}`);
    return response.failure(new BadRequestError(errorMessage));
  }

  const { fileName, mime } = JSON.parse(input.body) as UploadAttachmentRequest;

  if (!fileName) {
    const errorMessage = 'Could not find key "fileName" in request body';
    log.writeError(`service-users-api-uploadAttachment-001: ${errorMessage}`);
    return response.failure(new BadRequestError(errorMessage));
  }

  if (!mime) {
    const errorMessage = 'Could not find key "mime" in request body';
    log.writeError(`service-users-api-uploadAttachment-002: ${errorMessage}`);
    return response.failure(new BadRequestError(errorMessage));
  }

  if (!allowedFileType.includes(mime)) {
    const errorMessage = `The mimeType ${mime} is not allowed`;
    log.writeError(`service-users-api-uploadAttachment-003: ${errorMessage}`);
    return response.failure(new BadRequestError(errorMessage));
  }

  const uniquefileName = dependencies.createUniqueFileName(fileName, '_', uuid.v4);
  const fileStorageKeyName = `${decodedToken.personalNumber}/${uniquefileName}`;
  const params: SignedUrlParameters = {
    ContentType: mime,
    ACL: 'public-read',
    Key: fileStorageKeyName,
    Expires: 60 * 10,
  };

  const uploadUrl = dependencies.getSignedUrl(process.env.BUCKET_NAME, 'putObject', params);
  if (!uploadUrl) {
    const errorMessage = 'Get signed url error';
    log.writeError(errorMessage);
    return response.failure(new BadRequestError(errorMessage));
  }

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      uploadUrl,
      fileName: uniquefileName,
    },
  });
}

export const main = log.wrap(event => {
  return uploadAttachment(event, {
    decodeToken,
    getSignedUrl: S3.getSignedUrl,
    createUniqueFileName: getUniqueFileName,
  });
});
