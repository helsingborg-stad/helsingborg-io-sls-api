import to from 'await-to-js';
import S3 from '../../../libs/S3';
import * as response from '../../../libs/response';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import { decodeToken } from '../../../libs/token';

// File formats that we accept.
const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

/**
 * Get the user with the personal number specified in the path
 */
export async function main(event) {
  const decodedToken = decodeToken(event);

  const { fileName, mime } = JSON.parse(event.body);

  if (!fileName) {
    // Check if fileName exsits in event body
    return response.failure(new BadRequestError('Could not find key "fileName" in request body'));
  }

  if (!mime) {
    // Check if mimeType exists in event body.
    return response.failure(new BadRequestError('Could not find key "mime" in request body'));
  }

  if (!allowedMimes.includes(mime)) {
    // Check if passed mimeType is a fileformat that we allow.
    return response.failure(new BadRequestError(`The mimeType ${mime} is not allowed`));
  }

  // TODO: Decide the filename convention when generating a url.
  // TODO: Check if filename can be set to a random id despite the name of the upload file from client.
  // The path to where we want to upload a file in the s3 bucket.
  const s3Key = `${decodedToken.personalNumber}/${fileName}`;

  // TODO: Check if we can set a file size limit in these params.
  const params = {
    ContentType: mime,
    ACL: 'public-read',
    Key: s3Key,
    Expires: 60 * 10,
  };

  // Request pre signed upload url from aws s3.
  const [error, uploadUrl] = await to(S3.getSignedUrl('hbg-attachments', 'putObject', params));
  if (error) return response.failure(error);

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      uploadUrl,
    },
  });
}
