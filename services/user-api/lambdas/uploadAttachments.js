import * as response from '../../../libs/response';
import S3 from '../../../libs/S3';
import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import { decodeToken } from '../../../libs/token';

// File formats that we accept.
const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

/**
 * Get the user with the personal number specified in the path
 */
export async function main(event) {
  // eslint-disable-next-line no-console
  const decodedToken = decodeToken(event);

  const { fileName, mime } = JSON.parse(event.body);

  if (!allowedMimes.includes(mime)) {
    return response.failure(new BadRequestError(`The mimeType ${mime} is not allowed`));
  }

  // TODO: Decide the filename convention when generating a url.
  const s3Key = `${decodedToken.personalNumber}/${fileName}`;

  const params = {
    ContentType: mime,
    ACL: 'public-read',
    Key: s3Key,
    Expires: 60 * 10,
  };

  const uploadUrl = await S3.getSignedUrl('hbg-attachments', 'putObject', params);

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      uploadUrl,
      filePath: s3Key,
    },
  });
}
