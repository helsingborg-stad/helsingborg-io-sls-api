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

  const verifiedSessionId = verifySessionId(sessionId);

  const { ok, result } = await to(
    message(textInput, verifiedSessionId, assistantId, context, intents, entities),
  );

  if (!ok) {
    logger.error(result);
    return failure({ status: ok, error: result });
  }

  return success({
    status: true,
    message: { ...result, session_id: verifiedSessionId },
  });
};

function verifySessionId(id) {
  let _id = id || null;

  if (!_id) {
    const { ok, result } = await to(createSession(assistantId));

    if (!ok) {
      logger.error(result);
      failure({ status: false, error: result });
    }

    _id = result.result.session_id;
  }

  return _id;
}