import logger from '@financial-times/lambda-logger';
import * as response from '../../../libs/response';
import { to } from '../../../libs/helpers';
import { createSession } from '../helpers/watson-lib';

export const main = async event => {
  const { assistantId } = JSON.parse(event.body);

  const [success, sessionResponse] = await to(createSession(assistantId));

  if (!success) {
    // eslint-disable-next-line no-unused-vars
    const { headers, ...errorAttributes } = sessionResponse;
    logger.error(sessionResponse);
    return response.failure({
      status: false,
      error: { ...errorAttributes },
    });
  }

  return response.success({
    status: true,
    type: 'watsonSession',
    attributes: { ...sessionResponse.result },
  });
};
