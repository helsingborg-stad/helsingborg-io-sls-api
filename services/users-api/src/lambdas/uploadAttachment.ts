import to from 'await-to-js';
import S3 from '../libs/S3';
import * as response from '../libs/response';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import { decodeToken, Token } from '../libs/token';
import log from '../libs/logs';
import { getUniqueFileName } from '../helpers/files';

export interface UploadAttachmentRequest {
  fileName?: string;
  mime?: string;
}

export interface LambdaContext {
  decodeToken: (event: AWSEvent) => Token;
  getUniqueFileName: (name: string) => string;
  getSignedUrl: (
    bucketName?: string,
    method?: string,
    params?: Record<string, unknown>
  ) => Promise<string>;
}

export interface AWSEvent {
  body?: string;
  headers?: {
    Authorization?: string;
  };
}

export interface AWSContext {
  awsRequestId: string;
}

// File formats that we accept.
const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

export async function main(event: AWSEvent, awsContext: AWSContext) {
  return await lambda(event, awsContext, {
    decodeToken,
    getUniqueFileName,
    getSignedUrl: S3.getSignedUrl,
  });
}
/**
 * Get the user with the personal number specified in the path
 */
export async function lambda(
  event: AWSEvent,
  awsContext: AWSContext,
  lambdaContext: LambdaContext
) {
  const decodedToken = lambdaContext.decodeToken(event);

  if (!event?.body) {
    const errorMessage = 'Body data is missing in request';
    log.error(errorMessage, awsContext.awsRequestId, 'service-users-api-uploadAttachment-000');
    return response.failure(new BadRequestError(errorMessage));
  }

  const { fileName, mime } = JSON.parse(event.body) as UploadAttachmentRequest;

  if (!fileName) {
    // Check if fileName exsits in event body
    const errorMessage = 'Could not find key "fileName" in request body';
    log.error(errorMessage, awsContext.awsRequestId, 'service-users-api-uploadAttachment-001');

    return response.failure(new BadRequestError(errorMessage));
  }

  if (!mime) {
    // Check if mimeType exists in event body.
    const errorMessage = 'Could not find key "mime" in request body';
    log.error(errorMessage, awsContext.awsRequestId, 'service-users-api-uploadAttachment-002');

    return response.failure(new BadRequestError());
  }

  if (!allowedMimes.includes(mime)) {
    // Check if passed mimeType is a fileformat that we allow.
    const errorMessage = `The mimeType ${mime} is not allowed`;
    log.error(errorMessage, awsContext.awsRequestId, 'service-users-api-uploadAttachment-003');

    return response.failure(new BadRequestError(errorMessage));
  }

  // The path to where we want to upload a file in the s3 bucket.
  const s3FileName = lambdaContext.getUniqueFileName(fileName);
  const s3Key = `${decodedToken.personalNumber}/${s3FileName}`;

  // TODO: Check if we can set a file size limit in these params.
  const params = {
    ContentType: mime,
    ACL: 'public-read',
    Key: s3Key,
    Expires: 60 * 10,
  };

  // Request pre signed upload url from aws s3.
  const [error, uploadUrl] = await to(
    lambdaContext.getSignedUrl(process.env.BUCKET_NAME, 'putObject', params)
  );

  if (error) {
    log.error(
      'Get signed url error',
      awsContext.awsRequestId,
      'service-users-api-uploadAttachment-003'
    );

    return response.failure(error);
  }

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      uploadUrl,
      fileName: s3FileName,
    },
  });
}
