// import logger from '@financial-times/lambda-logger';
import AssistantV2 from 'ibm-watson/assistant/v2';
import { IamAuthenticator } from 'ibm-watson/auth';
import { to } from '../../../libs/helpers';

// ENV
const {
  WATSON_ASSISTANT_VERSION_DATE,
  WATSON_ASSISTANT_IAM_APIKEY,
  WATSON_ASSISTANT_ID,
  WATSON_SERVICE_ENDPOINT,
} = process.env;

const options = {
  version: WATSON_ASSISTANT_VERSION_DATE,
  authenticator: new IamAuthenticator({ apikey: WATSON_ASSISTANT_IAM_APIKEY }),
  url: WATSON_SERVICE_ENDPOINT,
};

/**
 * Interact with Watson API
 */
const assistant = new AssistantV2(options);

/**
 * Create a session
 * @param {string} assistantId
 */
export const createSession = async (assistantId = WATSON_ASSISTANT_ID) => {
  const { ok, result } = await to(assistant.createSession({ assistantId }));

  if (!ok) {
    return Promise.reject(result);
  }

  return result;
};

/**
 * Send user input message to Watson
 * @param {String} sessionId Session ID
 * @param {String} assistantId GUID of an assistant
 * @param {String} text User input message
 * @param {String} context Conversation ID, defaults to undefined (to initiate a new conversation)
 * @return {promise} Watson response
 */
export const message = (
  text,
  sessionId,
  assistantId = WATSON_ASSISTANT_ID,
  context = undefined,
  intents = undefined,
  entities = undefined,
) => {
  const payload = {
    assistantId,
    sessionId,
    input: {
      message_type: 'text',
      text,
      options: {
        return_context: true,
      },
    },
    context,
    intents,
    entities,
  };

  return new Promise((resolve, reject) =>
    assistant.message(payload, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
};