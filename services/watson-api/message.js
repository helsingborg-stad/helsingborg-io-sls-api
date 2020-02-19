import logger from '@financial-times/lambda-logger';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';
import { message, createSession } from './libs/watson-lib';

export const main = async (event) => {
  const {
    assistantId,
    textInput,
    context,
    intents,
    entities,
    sessionId,
  } = event.body;

  let verifiedSessionId = sessionId || null;

  if (!verifiedSessionId) {
    const { ok, result } = await to(createSession(assistantId));

    if (!ok) {
      logger.error(result);
      failure({ status: false, error: result });
    }

    verifiedSessionId = result.result.session_id;
  }

  const { ok, result } = await to(
    message(textInput, verifiedSessionId, assistantId, context, intents, entities),
  );

  if (!ok) {
    logger.error(result);
    return failure({ status: false, error: result });
  }

  return success({
    status: true,
    message: { ...result, session_id: verifiedSessionId },
  });
};