// import logger from '@financial-times/lambda-logger';
import AssistantV2 from 'ibm-watson/assistant/v2';
import { IamAuthenticator } from 'ibm-watson/auth';
import { to } from '../../../libs/helpers';
import params from '../../../libs/params';

// SSM PARAMS
const watsonParams = params.read(
  '/watsonEnvs/dev'
);

/**
 * Function for creating a new instance of the Watson Assistans v2
 */
const createAssistant = async () => {
  const {
    assistantVersionDate,
    assistantIAMKey,
    serviceEndpoint
  } = await watsonParams;

  const options = {
    version: assistantVersionDate,
    authenticator: new IamAuthenticator({ apikey: assistantIAMKey }),
    url: serviceEndpoint
  };
  return new AssistantV2(options);
};

/**
 * Create a new Assistant instance to use.
 */
const assistant = createAssistant();

/**
 * Create a session
 * @param {string} assistantId
 */
export const createAssistantSession = async assistantId => {
  const watsonAssistant = await assistant;
  const [ok, result] = await to(
    watsonAssistant.createSession({ assistantId })
  );

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
export const sendMessage = async (
  text,
  sessionId,
  assistantId,
  context = undefined,
  intents = undefined,
  entities = undefined,
) => {
  const watsonAssistant = await assistant;
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
    watsonAssistant.message(payload, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
};
