import * as response from '../../../libs/response';
/**
 * Function for adding logics to an existing form in dynamodb.
 */

export async function main() {
  return response.failure({
    status: 501,
    code: 501,
    title: 'Not Implemented',
    detail: 'The server does not support the functionality required to fulfill the request.',
    message: 'The server does not support the functionality required to fulfill the request.',
  });
}
