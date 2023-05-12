import to from 'await-to-js';
import type { SQSEvent, Context } from 'aws-lambda';

import * as dynamoDb from '../libs/dynamoDb';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';
import { VIVA_APPLICATION_RECEIVED } from '../libs/constants';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import attachment from '../helpers/attachment';

import { destructRecord } from '../helpers/dynamoDb';
import { validateSQSEvent } from '../helpers/validateSQSEvent';
import { TraceException } from '../helpers/TraceException';

import { VivaApplicationType } from '../types/vivaMyPages';
import type { VivaAttachment } from '../types/vivaAttachment';
import type { PersonalNumber, CaseItem, CaseFormAnswer } from '../types/caseItem';
import type {
  PostApplicationsPayload,
  PostApplicationsResponse,
} from '../helpers/vivaAdapterRequestClient';
import type { VadaError } from '../types/vadaResponse';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface ParamsReadResponse {
  recurringFormId: string;
  newApplicationFormId: string;
}

interface SuccessEvent {
  user: {
    personalNumber: string;
  };
}

interface ErrorEvent {
  messageId: string;
  caseId: string;
  errorDetails: VadaError;
}

export interface LambdaRequest {
  messageId: string;
  caseItem: CaseItem;
}

export interface Dependencies {
  requestId: string;
  readParams: (envsKeyName: string) => Promise<ParamsReadResponse>;
  updateCase: (params: CaseKeys, workflowId: string) => Promise<void>;
  postVivaApplication: (params: PostApplicationsPayload) => Promise<PostApplicationsResponse>;
  putSuccessEvent: (params: SuccessEvent) => Promise<void>;
  triggerSubmitWithError: (params: ErrorEvent) => Promise<void>;
  attachmentFromAnswers: (
    personalNumber: PersonalNumber,
    answerList: CaseFormAnswer[]
  ) => Promise<VivaAttachment[]>;
  isAnswerAttachment: (answer: CaseFormAnswer) => boolean;
}

export function updateVivaCase(keys: CaseKeys, workflowId: string): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET #state = :newState, details.workflowId = :newWorkflowId',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newWorkflowId': workflowId,
      ':newState': VIVA_APPLICATION_RECEIVED,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function submitApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { caseItem, messageId } = input;
  const { PK, SK, pdf, currentFormId, details, forms, id: caseId } = caseItem;
  const { recurringFormId, newApplicationFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );

  const isNotApplicationForm = ![recurringFormId, newApplicationFormId].includes(currentFormId);

  if (isNotApplicationForm) {
    log.writeInfo('Current form is not a recurring or newApplication form', currentFormId);
    return true;
  }

  const personalNumber = PK.substring(5);

  const isRecurringForm = recurringFormId === currentFormId;
  const applicationType = isRecurringForm ? VivaApplicationType.Recurring : VivaApplicationType.New;
  const formId = isRecurringForm ? recurringFormId : newApplicationFormId;
  const workflowId = details.workflowId ?? '';
  const formAnswers = forms[formId].answers ?? [];
  const answers = formAnswers.filter(answer => !dependencies.isAnswerAttachment(answer));
  const attachments = await dependencies.attachmentFromAnswers(personalNumber, formAnswers);

  const [vadaError, vadaResponse] = await to<
    PostApplicationsResponse | undefined,
    VadaError | null
  >(
    dependencies.postVivaApplication({
      applicationType,
      personalNumber,
      workflowId,
      answers,
      attachments,
      rawData: pdf?.toString() ?? '',
      rawDataType: 'pdf',
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

    if (vivaErrorCode === '1014') {
      const errorMessage = `Viva responded with error code ${vivaErrorCode}. Will NOT retry.`;
      log.writeWarn(errorMessage, {
        messageId,
        caseId,
        vivaErrorCode,
        vivaErrorMessage,
        vivaErrorDetails,
      });

      return true;
    }

    throw new TraceException(
      'Failed to submit Viva application. Will retry.',
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

  const vivaWorkflowId = vadaResponse?.id ?? '';
  await dependencies.updateCase({ PK, SK }, vivaWorkflowId);
  await dependencies.putSuccessEvent({
    user: {
      personalNumber,
    },
  });

  log.writeInfo('Record processed SUCCESSFULLY', { messageId, caseId });

  return true;
}

export const main = log.wrap((event: SQSEvent, context: Context) => {
  validateSQSEvent(event, context);

  const [record] = event.Records;
  const { messageId, attributes } = record;
  const { ApproximateReceiveCount: receiveCount, ApproximateFirstReceiveTimestamp: firstReceived } =
    attributes;

  const { awsRequestId: requestId } = context;

  const caseItem = destructRecord(record);

  log.writeInfo('Processing record', {
    messageId,
    receiveCount,
    firstReceived,
    caseId: caseItem.id,
  });

  return submitApplication(
    { caseItem, messageId },
    {
      requestId,
      readParams: params.read,
      updateCase: updateVivaCase,
      postVivaApplication: vivaAdapter.applications.post,
      putSuccessEvent: putVivaMsEvent.applicationReceivedSuccess,
      triggerSubmitWithError: putVivaMsEvent.applicationSubmitWithError,
      attachmentFromAnswers: attachment.createFromAnswers,
      isAnswerAttachment: attachment.isAnswerAttachment,
    }
  );
});
