import * as response from '../../../libs/response';

/**
 * Get the user with the personal number specified in the path
 */
export const main = async () =>
  response.buildResponse(200, {
    type: 'userAttachments',
    attributes: {
      message: 'cool kid',
    },
  });
