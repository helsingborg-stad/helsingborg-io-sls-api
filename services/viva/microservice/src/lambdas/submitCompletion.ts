import to from 'await-to-js';
import type { SQSEvent, Context } from 'aws-lambda';

import { VIVA_COMPLETION_RECEIVED, VIVA_RANDOM_CHECK_RECEIVED } from '../libs/constants';
import { cases } from '../helpers/query';
import * as dynamoDb from '../libs/dynamoDb';
import S3 from '../libs/S3';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';
import caseHelper from '../helpers/createCase';
import attachment from '../helpers/attachment';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { validateSQSEvent } from '../helpers/validateSQSEvent';
import { TraceException } from '../helpers/TraceException';
import type { VivaAttachment } from '../types/vivaAttachment';
import type {
  PostCompletionsPayload,
  PostCompletionsResponse,
} from '../helpers/vivaAdapterRequestClient';
import type { CaseItem, CaseForm, CaseFormAnswer, CaseStatus } from '../types/caseItem';
import type { EventDetailCaseKeys } from '../types/eventDetail';
import type { VivaParametersResponse } from '../types/ssmParameters';
import type { VadaError } from '../types/vadaResponse';

export interface LambdaDetail {
  readonly caseKeys: EventDetailCaseKeys;
  readonly status?: CaseStatus;
  readonly state?: string;
  readonly messageId: string;
}

interface CaseKeys {
  readonly PK: string;
  readonly SK: string;
}

interface ErrorEvent {
  messageId: string;
  caseId: string;
  errorDetails: VadaError;
}

export interface LambdaRequest {
  readonly detail: LambdaDetail;
}

interface UpdateCaseParameters {
  keys: CaseKeys;
  newState: typeof VIVA_COMPLETION_RECEIVED | typeof VIVA_RANDOM_CHECK_RECEIVED;
  currentFormId: string;
  initialCompletionForm: Record<string, CaseForm>;
}

export interface Dependencies {
  requestId: string;
  getCase: (keys: EventDetailCaseKeys) => Promise<CaseItem>;
  readParams: (name: string) => Promise<VivaParametersResponse>;
  postCompletions: (payload: PostCompletionsPayload) => Promise<PostCompletionsResponse>;
  updateCase: (params: UpdateCaseParameters) => Promise<void>;
  triggerSubmitWithError: (params: ErrorEvent) => Promise<void>;
  getAttachments: (
    personalNumber: string,
    answerList: CaseFormAnswer[]
  ) => Promise<VivaAttachment[]>;
  deleteAttachments: (attachments: VivaAttachment[]) => Promise<void>;
}

function getReceivedState(currentFormId: string, randomCheckFormId: string) {
  return currentFormId === randomCheckFormId
    ? VIVA_RANDOM_CHECK_RECEIVED
    : VIVA_COMPLETION_RECEIVED;
}

function updateCase(params: UpdateCaseParameters): Promise<void> {
  const { keys, currentFormId, initialCompletionForm, newState } = params;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET #state = :newState, forms.#formId = :resetedCompletionForm',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#formId': currentFormId,
    },
    ExpressionAttributeValues: {
      ':newState': newState,
      ':resetedCompletionForm': initialCompletionForm[currentFormId],
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

function deleteS3Attachments(attachments: VivaAttachment[]) {
  const keys = attachments.map(({ id }) => ({ Key: id }));

  return S3.deleteFiles(process.env.BUCKET_NAME as string, keys);
}

function createCaseId(keys: CaseKeys) {
  return keys.SK.split('CASE#')[1];
}

export async function submitCompletion(
  input: LambdaDetail,
  dependencies: Dependencies
): Promise<boolean> {
  const { caseKeys, messageId } = input;

  const caseItem = await dependencies.getCase(caseKeys);
  if (!caseItem) {
    log.writeWarn(`Viva caseKeys: ${caseKeys} could not be found. Will not NOT retry.`);
    return true;
  }

  const { randomCheckFormId, completionFormId, newApplicationCompletionFormId } =
    await dependencies.readParams(config.cases.providers.viva.envsKeyName);

  const { currentFormId, id: caseId } = caseItem;
  const isCompletionForm = [
    randomCheckFormId,
    completionFormId,
    newApplicationCompletionFormId,
  ].includes(currentFormId);

  if (!isCompletionForm) {
    return true;
  }

  const personalNumber = caseItem.PK.substring(5);
  const caseAnswers = caseItem.forms[currentFormId].answers;

  const [getAttachmentsError, attachments] = await to(
    dependencies.getAttachments(personalNumber, caseAnswers)
  );
  if (getAttachmentsError) {
    log.writeWarn(
      `Failed to read file from S3 - ${getAttachmentsError.message}. Will not NOT retry.`,
      getAttachmentsError
    );
    return true;
  }

  const workflowId = caseItem.details.workflowId;
  if (!workflowId) {
    log.writeWarn(`Viva workflowId: ${workflowId} could not be found. Will not NOT retry.`);
    return true;
  }

  const [vadaError, vadaResponse] = await to<PostCompletionsResponse | undefined, VadaError | null>(
    dependencies.postCompletions({
      personalNumber,
      workflowId,
      attachments: attachments ?? [],
    })
  );

  if (vadaError) {
    const vivaErrorCode = vadaError.vadaResponse.error?.details?.errorCode ?? null;
    const vivaErrorMessage = vadaError.vadaResponse.error?.details?.errorMessage ?? null;
    const vivaErrorDetails = vadaError.vadaResponse.error?.details ?? null;

    await dependencies.triggerSubmitWithError({
      messageId,
      caseId,
      errorDetails: vadaError,
    });

    throw new TraceException(
      'Failed to submit Viva completions. Will retry.',
      dependencies.requestId,
      {
        messageId,
        caseId,
        httpStatusCode: vadaError.status,
        vivaErrorCode,
        vivaErrorMessage,
        vivaErrorDetails,
      }
    );
  }

  const isCompletionReceived = vadaResponse?.status.toLowerCase() === 'ok';
  if (!isCompletionReceived) {
    throw new TraceException(
      'Failed to submit Viva completions. Will retry.',
      dependencies.requestId,
      {
        messageId,
        caseId,
        status: vadaResponse?.status,
      }
    );
  }

  const initialCompletionFormEncryption = caseHelper.getFormEncryptionAttributes();
  const initialCompletionForm = caseHelper.getInitialFormAttributes(
    [currentFormId],
    initialCompletionFormEncryption
  );
  const newState = getReceivedState(currentFormId, randomCheckFormId);

  const updateCaseParams: UpdateCaseParameters = {
    keys: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    currentFormId,
    initialCompletionForm,
    newState,
  };

  await dependencies.updateCase(updateCaseParams);
  await dependencies.deleteAttachments(attachments ?? []);

  log.writeInfo('Record processed SUCCESSFULLY', { messageId, caseId });

  return true;
}

export const main = log.wrap((event: SQSEvent, context: Context) => {
  validateSQSEvent(event, context);

  const [record] = event.Records;
  const { messageId, attributes, body } = record;
  const { ApproximateReceiveCount: receiveCount, ApproximateFirstReceiveTimestamp: firstReceived } =
    attributes;
  const { awsRequestId: requestId } = context;

  const lambdaRequest = JSON.parse(body) as LambdaRequest;

  log.writeInfo('Processing record', {
    messageId,
    receiveCount,
    firstReceived,
    caseId: createCaseId(lambdaRequest.detail.caseKeys),
  });

  return submitCompletion(
    {
      messageId,
      caseKeys: lambdaRequest.detail.caseKeys,
    },
    {
      requestId,
      getCase: cases.get,
      readParams: params.read,
      postCompletions: vivaAdapter.completions.post,
      updateCase,
      getAttachments: attachment.createFromAnswers,
      deleteAttachments: deleteS3Attachments,
      triggerSubmitWithError: putVivaMsEvent.completions.submitFailed,
    }
  );
});
