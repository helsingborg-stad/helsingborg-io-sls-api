import to from 'await-to-js';
import { SQSEvent, Context } from 'aws-lambda';

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
import type { CaseItem } from '../types/caseItem';

interface VivaPostError {
  status: string;
  vadaResponse: {
    error?: {
      details?: {
        errorCode?: string;
        errorMessage?: string;
      };
    };
  };
}

interface ParamsReadResponse {
  recurringFormId: string;
  newApplicationFormId: string;
}

export interface Dependencies {
  requestId: string;
  readParams: (envsKeyName: string) => Promise<ParamsReadResponse>;
  updateVivaCase: (params: CaseKeys, workflowId: string) => Promise<null>;
  postVivaApplication: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  putSuccessEvent: (params: { personalNumber: string }) => Promise<null>;
}

export interface LambdaRequest {
  caseItem: Case;
  messageId: string;
}

export type LambdaResponse = boolean;

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;
type Case = Pick<CaseItem, 'PK' | 'SK' | 'forms' | 'currentFormId' | 'details' | 'pdf' | 'id'>;

export function updateVivaCase(keys: CaseKeys, workflowId: string): Promise<null> {
  const params = {
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

  return dynamoDb.call('update', params);
}

export async function submitApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const { caseItem, messageId } = input;
  const { requestId, readParams, updateVivaCase, postVivaApplication, putSuccessEvent } =
    dependencies;

  const { PK, SK, pdf, currentFormId, details, forms, id } = caseItem;
  const { recurringFormId, newApplicationFormId } = await readParams(
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
  const answers = forms?.[formId].answers ?? [];
  const workflowId = details?.workflowId ?? '';
  const attachments = await attachment.createFromAnswers(personalNumber, answers);

  const [vivaPostError, vivaApplicationResponse] = await to<Record<string, unknown>, VivaPostError>(
    postVivaApplication({
      applicationType,
      personalNumber,
      workflowId,
      answers,
      attachments,
      rawData: pdf?.toString(),
      rawDataType: 'pdf',
    })
  );
  if (vivaPostError) {
    const postError = {
      messageId,
      caseId: id,
      httpStatusCode: vivaPostError.status,
      ...(vivaPostError.vadaResponse?.error?.details?.errorCode && {
        vivaErrorCode: vivaPostError.vadaResponse.error.details.errorCode,
      }),
      ...(vivaPostError.vadaResponse?.error?.details?.errorMessage && {
        vivaErrorMessage: vivaPostError.vadaResponse.error.details.errorMessage,
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

  if (vivaApplicationResponse?.status !== 'OK') {
    log.writeError('Viva response status NOT ok!', vivaApplicationResponse?.status);
    throw new TraceException('Viva application receive failed. Will be retried.', requestId, {
      vivaResponse: { ...vivaApplicationResponse },
    });
  }

  const vivaWorkflowId = vivaApplicationResponse.id as string;
  await updateVivaCase({ PK, SK }, vivaWorkflowId);

  const clientUser = { personalNumber };
  await putSuccessEvent(clientUser);

  log.writeInfo('Record processed SUCCESSFULLY', { messageId, caseId: SK });
  return true;
}

export const main = log.wrap(async (event: SQSEvent, context: Context) => {
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

  const lambdaEvent = { caseItem, receiveCount, firstReceived, messageId };

  return submitApplication(lambdaEvent, {
    requestId,
    readParams: params.read,
    updateVivaCase,
    postVivaApplication: vivaAdapter.application.post,
    putSuccessEvent: putVivaMsEvent.applicationReceivedSuccess,
  });
});
