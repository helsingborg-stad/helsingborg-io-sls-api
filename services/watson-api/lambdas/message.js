import logger from '@financial-times/lambda-logger';
import * as response from '../../../libs/response';
import to from 'await-to-js';
import { sendMessage, createAssistantSession } from '../helpers/watson-lib';

export const main = async event => {
  const { assistantId, textInput, context, intents, entities, sessionId } = JSON.parse(event.body);

  let error, sessionResponse, messageResponse;
  let verifiedSessionId = sessionId || null;
  // Create Watson Assistant Session if There is none.
  if (!verifiedSessionId) {
    [error, sessionResponse] = await to(createAssistantSession(assistantId));

    if (!sessionResponse) return response.failure(error);

    verifiedSessionId = sessionResponse.result.session_id;
  }

  // Send text input to Watson Assistant and retrive message.
  [error, messageResponse] = await to(
    sendMessage(textInput, verifiedSessionId, assistantId, context, intents, entities)
  );

  if (!messageResponse) {
    logger.error(error);
    return response.failure(error);
  }

  return response.success(200, {
    type: 'watsonMessage',
    attributes: { ...messageResponse.result, session_id: verifiedSessionId },
  });
};
