import logger from '@financial-times/lambda-logger';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';
import { createSession } from './libs/watson-lib';

export const main = async (event, context) => {
  const { assistantId } = event.body;

  const { ok, result } = await to(createSession(assistantId));

  if(!ok) {
    logger.error(result);
    return failure({ status: false, error: result });
  }

  return success({ status: true, session: result });
};
