import logger from '@financial-times/lambda-logger';
import * as response from '../../../libs/response';
import to from 'await-to-js';
import { createAssistantSession } from '../helpers/watson-lib';

export const main = async event => {
  const { assistantId } = JSON.parse(event.body);

  const [error, sessionResponse] = await to(createAssistantSession(assistantId));
  if (!sessionResponse) {
    logger.error(sessionResponse);
    return response.failure(error);
  }

  return response.success(200, {
    status: true,
    type: 'watsonSession',
    attributes: { ...sessionResponse.result },
  });
};
