/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import params from '../libs/params';
import { VIVA_APPLICATION_RECEIVED } from '../libs/constants';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const dynamoDbConverter = AWS.DynamoDB.Converter;
class TraceException extends Error {
  constructor(message, requestId, customData) {
    super(message);
    this.level = 'error';
    this.requestId = requestId;
    this.customData = customData;
  }
}
const destructRecord = record => {
  const body = JSON.parse(record.body);
  return dynamoDbConverter.unmarshall(body.detail.dynamodb.NewImage);
};

export async function main(event, context) {
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
  const caseItem = destructRecord(record);
  const { PK, SK, pdf: pdfBinaryBuffer } = caseItem;

  log.info('Processing record', context.awsRequestId, undefined, {
    messageId: record.messageId,
    receiveCount: record.attributes.ApproximateReceiveCount,
    firstReceived: record.attributes.ApproximateFirstReceiveTimestamp,
    visibilityTimeout: record.attributes.VisibilityTimeout,
    caseId: SK,
  });

  const { recurringFormId } = vivaCaseSSMParams;

  if (caseItem.currentFormId !== recurringFormId) {
    log.info(
      'Current form is not an recurring form',
      context.awsRequestId,
      'service-viva-ms-submitApplication-002'
    );
    return true;
  }

  const personalNumber = PK.substring(5);

  const [vivaPostError, vivaApplicationResponse] = await to(
    vivaAdapter.application.post({
      applicationType: 'recurrent',
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

  if (notApplicationReceived(vivaApplicationResponse)) {
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
  const [updateError] = await to(updateVivaCase(caseKeys, vivaApplicationResponse.id));
  if (updateError) {
    throw new TraceException('Failed to update Viva case', context.awsRequestId, updateError);
  }

  const clientUser = { personalNumber };
  const [putEventError] = await to(putVivaMsEvent.applicationReceivedSuccess(clientUser));
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

function notApplicationReceived(response) {
  if (response?.status !== 'OK') {
    return true;
  }

  return false;
}

function updateVivaCase(caseKeys, workflowId) {
  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #state = :newState, #details.#workflowId = :newWorkflowId',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#details': 'details',
      '#workflowId': 'workflowId',
    },
    ExpressionAttributeValues: {
      ':newWorkflowId': workflowId,
      ':newState': VIVA_APPLICATION_RECEIVED,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
