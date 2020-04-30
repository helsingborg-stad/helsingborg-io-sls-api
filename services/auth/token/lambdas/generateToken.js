import to from 'await-to-js';

import { signToken } from '../helpers/token';
import * as response from '../../../../libs/response';

export async function main(event) {
  const jsonRequest = JSON.parse(event.body);
  const [error, token] = await to(signToken(jsonRequest));
  if (error) return response.failure(error);

  return response.success({
    accessToken: token,
  });
}
