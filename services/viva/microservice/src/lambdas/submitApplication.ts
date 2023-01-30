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
import type { PostApplicationsPayload } from '../helpers/vivaAdapterRequestClient';
import type { VadaError } from '../types/vadaResponse';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface ParamsReadResponse {
  recurringFormId: string;
  newApplicationFormId: string;
}

export interface Dependencies {
  requestId: string;
  readParams: (envsKeyName: string) => Promise<ParamsReadResponse>;
  updateVivaCase: (params: CaseKeys, workflowId: string) => Promise<void>;
  postVivaApplication: (params: PostApplicationsPayload) => Promise<Record<string, unknown>>;
  putSuccessEvent: (params: { personalNumber: string }) => Promise<void>;
  attachmentFromAnswers: (
    personalNumber: PersonalNumber,
    answerList: CaseFormAnswer[]
  ) => Promise<VivaAttachment[]>;
  isAnswerAttachment: (answer: CaseFormAnswer) => boolean;
}

export interface LambdaRequest {
  messageId: string;
  caseItem: CaseItem;
}

export type LambdaResponse = boolean;

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
): Promise<LambdaResponse> {
  const { caseItem, messageId } = input;
  const { requestId } = dependencies;

  const { PK, SK, pdf, currentFormId, details, forms, id } = caseItem;
  const { recurringFormId, newApplicationFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );

  if (![recurringFormId, newApplicationFormId].includes(currentFormId)) {
    log.writeInfo('Current form is not a recurring or newApplication form', currentFormId);
    return true;
  }

  const personalNumber = PK.substring(5);

  const isRecurringForm = recurringFormId === currentFormId;
  const applicationType = isRecurringForm ? VivaApplicationType.Recurring : VivaApplicationType.New;
  const formId = isRecurringForm ? recurringFormId : newApplicationFormId;
  const workflowId = details.workflowId ?? '';
  const formAnswers = forms?.[formId].answers ?? [];
  const answers = formAnswers.filter(answer => !dependencies.isAnswerAttachment(answer));
  const attachments = await dependencies.attachmentFromAnswers(personalNumber, formAnswers);

  const [vadaError, vadaResponse] = await to<Record<string, unknown>, VadaError>(
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
    const postError = {
      messageId,
      caseId: id,
      httpStatusCode: vadaError.status,
      ...(vadaError.vadaResponse?.error?.details?.errorCode && {
        vivaErrorCode: vadaError.vadaResponse.error.details.errorCode,
      }),
      ...(vadaError.vadaResponse?.error?.details?.errorMessage && {
        vivaErrorMessage: vadaError.vadaResponse.error.details.errorMessage,
      }),
    };

    if (postError.vivaErrorCode === '1014') {
      log.writeWarn('Failed to submit Viva application. Will NOT retry.', postError);
      return true;
    }

    throw new TraceException(
      'Failed to submit Viva application. Will be retried.',
      requestId,
      postError
    );
  }

  if (vadaResponse?.status !== 'OK') {
    log.writeError('Viva response status NOT ok!', vadaResponse?.status);
    throw new TraceException('Viva application receive failed. Will be retried.', requestId, {
      vadaResponse: { ...vadaResponse },
    });
  }

  const vivaWorkflowId = vadaResponse.id as string;
  await dependencies.updateVivaCase({ PK, SK }, vivaWorkflowId);
  await dependencies.putSuccessEvent({ personalNumber });

  log.writeInfo('Record processed SUCCESSFULLY', { messageId, caseId: SK });
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

  const lambdaEvent = { caseItem, messageId };

  return submitApplication(lambdaEvent, {
    requestId,
    readParams: params.read,
    updateVivaCase,
    postVivaApplication: vivaAdapter.applications.post,
    putSuccessEvent: putVivaMsEvent.applicationReceivedSuccess,
    attachmentFromAnswers: attachment.createFromAnswers,
    isAnswerAttachment: attachment.isAnswerAttachment,
  });
});
