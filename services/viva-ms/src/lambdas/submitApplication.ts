import to from 'await-to-js';
import AWS from 'aws-sdk';
import { SQSEvent, SQSRecord, Context } from 'aws-lambda';

import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { updateVivaCase } from '../helpers/dynamoDb';
import { validateSQSEvent } from '../helpers/validateSQSEvent';
import { TraceException } from '../helpers/TraceException';

import { CaseItem } from '../types/caseItem';

type Case = Pick<CaseItem, 'PK' | 'SK' | 'forms' | 'currentFormId' | 'details' | 'pdf'>;

const destructRecord = (record: SQSRecord): Case => {
  const body = JSON.parse(record.body);
  return AWS.DynamoDB.Converter.unmarshall(body.detail.dynamodb.NewImage) as Case;
};

export function main(runtimeEvent: SQSEvent, runtimeContext: Context) {
  validateSQSEvent(runtimeEvent, runtimeContext);

  const [record] = runtimeEvent.Records;
  const { messageId, attributes } = record;
  const { ApproximateReceiveCount: receiveCount, ApproximateFirstReceiveTimestamp: firstReceived } =
    attributes;

  const { awsRequestId: requestId } = runtimeContext;

  const caseItem = destructRecord(record);

  log.info('Processing record', requestId, undefined, {
    messageId,
    receiveCount,
    firstReceived,
    caseId: caseItem.SK,
  });

  const event = { caseItem, receiveCount, firstReceived, messageId };
  const context = {
    requestId,
    readParams: params.read,
    updateVivaCase,
    postVivaApplication: vivaAdapter.application.post,
    putSuccessEvent: putVivaMsEvent.applicationReceivedSuccess,
  };

  return submitApplication(event, context);
}

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
export interface FunctionContext {
  requestId: string;
  readParams: (envsKeyName: string) => Promise<ParamsReadResponse>;
  updateVivaCase: (params: { PK: string; SK: string }, workflowId: string) => Promise<null>;
  postVivaApplication: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  putSuccessEvent: (params: { personalNumber: string }) => Promise<null>;
}

export interface FunctionEvent {
  caseItem: Case;
  messageId: string;
}
export async function submitApplication(event: FunctionEvent, context: FunctionContext) {
  const { caseItem, messageId } = event;
  const { requestId, readParams, updateVivaCase, postVivaApplication, putSuccessEvent } = context;

  const { PK, SK, pdf, currentFormId, details, forms } = caseItem;

  const [paramsReadError, vivaCaseSSMParams] = await to(
    readParams(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    throw new TraceException(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      requestId
    );
  }

  const { recurringFormId, newApplicationFormId } = vivaCaseSSMParams as ParamsReadResponse;

  if (![recurringFormId, newApplicationFormId].includes(currentFormId)) {
    log.info(
      'Current form is not a recurring or newApplication form',
      requestId,
      'service-viva-ms-submitApplication-002'
    );
    return true;
  }

  const personalNumber = PK.substring(5);

  const isRecurringForm = recurringFormId === currentFormId;
  const applicationType = isRecurringForm ? 'recurrent' : 'new';
  const formId = isRecurringForm ? recurringFormId : newApplicationFormId;

  const [vivaPostError, vivaApplicationResponse] = await to<Record<string, unknown>, VivaPostError>(
    postVivaApplication({
      applicationType,
      personalNumber,
      workflowId: details?.workflowId || '',
      answers: forms[formId].answers,
      rawData: pdf.toString(),
      rawDataType: 'pdf',
    })
  );

  if (vivaPostError) {
    const error = {
      messageId,
      httpStatusCode: vivaPostError.status,
      vivaErrorCode: vivaPostError.vadaResponse?.error?.details?.errorCode ?? 'N/A',
      vivaErrorMessage: vivaPostError.vadaResponse?.error?.details?.errorMessage ?? 'N/A',
      caseId: SK,
    };
    if (error.vivaErrorCode === '1014') {
      log.warn('Failed to submit Viva application. Will NOT be retried.', requestId, null, error);
      return true;
    }
    throw new TraceException(
      'Failed to submit Viva application. Will be retried.',
      requestId,
      error
    );
  }

  if (vivaApplicationResponse?.status !== 'OK') {
    throw new TraceException('Viva application receive failed', requestId, {
      vivaResponse: { ...vivaApplicationResponse },
    });
  }

  const caseKeys = { PK, SK };
  const [updateError] = await to<null, Record<string, unknown>>(
    updateVivaCase(caseKeys, vivaApplicationResponse.id as string)
  );
  if (updateError) {
    throw new TraceException('Failed to update Viva case', requestId, updateError);
  }

  const clientUser = { personalNumber };
  const [putEventError] = await to<null, Record<string, unknown>>(putSuccessEvent(clientUser));
  if (putEventError) {
    throw new TraceException(
      'Put event ´applicationReceivedSuccess´ failed',
      requestId,
      putEventError
    );
  }
  log.info('Record processed SUCCESSFULLY', requestId, undefined, { messageId, caseId: SK });
  return true;
}
