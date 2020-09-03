import * as response from '../../../libs/response';
import S3 from '../../../libs/S3';
import { v4 as uuid } from 'uuid';
import { throwError, BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import { decodeToken } from '../../../libs/token';

// File formats that we accept.
const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

/**
 * Get the user with the personal number specified in the path
 */
export async function main(event) {
  const decodedToken = decodeToken(event);

  const { body } = event;
  const jsonData = JSON.parse(body);
  if (!allowedMimes.includes(body.mime)) {
    return response.failure(new BadRequestError(`The mimeType ${body.mime} is not allowed`));
  }

  const s3Key = `${decodedToken.personalNumber}/${body.fileName}`;

  const params = {
    ContentType: jsonData.mime,
    ACL: 'public-read',
    Key: s3Key,
    Expires: 60 * 10,
  };

  const uploadUrl = await S3.getSignedUrl('hbg-attachments', 'putObject', params);

  return response.success(200, {
    type: 'userAttachment',
    attributes: {
      uploadUrl,
    },
  });
}
