import logger from '@financial-times/lambda-logger';
import * as response from '../../../libs/response';
import { to } from '../../../libs/helpers';
import { sendMessage, createAssistantSession } from '../helpers/watson-lib';

export const main = async event => {
  const { assistantId, textInput, context, intents, entities, sessionId } = JSON.parse(event.body);

  let verifiedSessionId = sessionId || null;

  // Create Watson Assistant Session
  if (!verifiedSessionId) {
    const [success, sessionResponse] = await to(createAssistantSession(assistantId));

    if (!success) {
      // eslint-disable-next-line no-unused-vars
      const { headers, ...errorAttributes } = sessionResponse;
      logger.error(sessionResponse);
      return response.failure({
        status: false,
        error: { ...errorAttributes },
      });
    }
    verifiedSessionId = sessionResponse.result.session_id;
  }

  // Send text input to Watson Assistant and retrive message.
  const [success, messageResponse] = await to(
    sendMessage(textInput, verifiedSessionId, assistantId, context, intents, entities)
  );

  if (!success) {
    // eslint-disable-next-line no-unused-vars
    const { headers, ...errorAttributes } = messageResponse;
    logger.error(messageResponse);
    return response.failure({
      status: false,
      error: { ...errorAttributes },
    });
  }

  return response.success({
    status: true,
    type: 'watsonMessage',
    attributes: { ...messageResponse.result, session_id: verifiedSessionId },
  });
};
