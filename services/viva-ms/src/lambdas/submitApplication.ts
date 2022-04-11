import to from 'await-to-js';
import AWS from 'aws-sdk';

import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { updateVivaCase } from '../helpers/dynamoDb';

import { CaseItem } from '../types/caseItem';

const dynamoDbConverter = AWS.DynamoDB.Converter;
class TraceException extends Error {
  private level: string;
  private requestId: string;
  private customData: Record<string, unknown> | undefined;

  constructor(message: string, requestId: string, customData?: Record<string, unknown>) {
    super(message);
    this.level = 'error';
    this.requestId = requestId;
    this.customData = customData;
  }
}
const destructRecord = (record: SQSRecord): Case => {
  const body = JSON.parse(record.body);
  return dynamoDbConverter.unmarshall(body.detail.dynamodb.NewImage) as Case;
};

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

interface LambdaContext {
  awsRequestId: string;
}

type Case = Pick<CaseItem, 'PK' | 'SK' | 'forms' | 'currentFormId' | 'details' | 'pdf'>;

interface SQSRecord {
  body: string;
  messageId: string;
  attributes: {
    ApproximateReceiveCount: number;
    ApproximateFirstReceiveTimestamp: number;
    VisibilityTimeout: number;
  };
}

interface LambdaEvent {
  Records: SQSRecord[];
}
export async function main(event: LambdaEvent, context: LambdaContext) {
  if (event.Records.length !== 1) {
    throw new TraceException(
      `Lambda received (${event.Records.length}) but expected only one.`,
      context.awsRequestId
    );
  }
  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    throw new TraceException(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId
    );
  }
  const [record] = event.Records;
  const body = JSON.parse(record.body);
  const caseItem = destructRecord(body);
  const { PK, SK, pdf: pdfBinaryBuffer } = caseItem;

  log.info('Processing record', context.awsRequestId, undefined, {
    messageId: record.messageId,
    receiveCount: record.attributes.ApproximateReceiveCount,
    firstReceived: record.attributes.ApproximateFirstReceiveTimestamp,
    visibilityTimeout: record.attributes.VisibilityTimeout,
    caseId: SK,
  });

  const { recurringFormId, newApplicationFormId } = vivaCaseSSMParams;

  if (![recurringFormId, newApplicationFormId].includes(caseItem.currentFormId)) {
    log.info(
      'Current form is not a recurring or newApplication form',
      context.awsRequestId,
      'service-viva-ms-submitApplication-002'
    );
    return true;
  }

  const personalNumber = PK.substring(5);
  const applicationType = recurringFormId === caseItem.currentFormId ? 'recurrent' : 'new';

  const [vivaPostError, vivaApplicationResponse] = await to<Record<string, unknown>, VivaPostError>(
    vivaAdapter.application.post({
      applicationType,
      personalNumber,
      workflowId: caseItem.details?.workflowId || '',
      answers: caseItem.forms[recurringFormId].answers,
      rawData: pdfBinaryBuffer.toString(),
      rawDataType: 'pdf',
    })
  );

  if (vivaPostError) {
    const error = {
      messageId: record.messageId,
      httpStatusCode: vivaPostError.status,
      vivaErrorCode: vivaPostError.vadaResponse?.error?.details?.errorCode ?? 'N/A',
      vivaErrorMessage: vivaPostError.vadaResponse?.error?.details?.errorMessage ?? 'N/A',
      caseId: SK,
    };
    if (error.vivaErrorCode === '1014') {
      log.warn(
        'Failed to submit Viva application. Will NOT be retried.',
        context.awsRequestId,
        null,
        error
      );
      return true;
    }
    throw new TraceException(
      'Failed to submit Viva application. Will be retried.',
      context.awsRequestId,
      error
    );
  }

  if (vivaApplicationResponse?.status !== 'OK') {
    throw new TraceException('Viva application receive failed', context.awsRequestId, {
      vivaResponse: { ...vivaApplicationResponse },
    });
  }

  if (!vivaApplicationResponse?.id) {
    throw new TraceException(
      'Viva application response does not contain any workflow id',
      context.awsRequestId,
      vivaApplicationResponse
    );
  }

  const caseKeys = { PK, SK };
  const [updateError] = await to<null, Record<string, unknown>>(
    updateVivaCase(caseKeys, vivaApplicationResponse.id)
  );
  if (updateError) {
    throw new TraceException('Failed to update Viva case', context.awsRequestId, updateError);
  }

  const clientUser = { personalNumber };
  const [putEventError] = await to<null, Record<string, unknown>>(
    putVivaMsEvent.applicationReceivedSuccess(clientUser)
  );
  if (putEventError) {
    throw new TraceException(
      'Put event ´applicationReceivedSuccess´ failed',
      context.awsRequestId,
      putEventError
    );
  }
  log.info('Record processed SUCCESSFULLY', context.awsRequestId, undefined, {
    messageId: record.messageId,
    caseId: SK,
  });
  return true;
}
