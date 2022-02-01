/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import params from '../../../libs/params';
import { VIVA_APPLICATION_RECEIVED } from '../../../libs/constants';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const dynamoDbConverter = AWS.DynamoDB.Converter;

const destructRecord = record => {
  const body = JSON.parse(record.body);
  return dynamoDbConverter.unmarshall(body.detail.dynamodb.NewImage);
};

export async function main(event, context) {
  log.info(event);
  const failedRecords = event.Records.map(record => record.messageId);

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-001',
      paramsReadError
    );
    return null;
  }

  for (const record of event.Records) {
    const caseItem = destructRecord(record);

    const { recurringFormId } = vivaCaseSSMParams;

    if (caseItem.currentFormId !== recurringFormId) {
      failedRecords.shift();
      log.info(
        'Current form is not an recurring form',
        context.awsRequestId,
        'service-viva-ms-submitApplication-002'
      );
      continue;
    }

    const { PK, SK, pdf: pdfBinaryBuffer } = caseItem;
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
      log.error(
        'Failed to submit Viva application',
        context.awsRequestId,
        'service-viva-ms-submitApplication-003',
        {
          axios: { ...vivaPostError },
        }
      );
      continue;
    }

    if (notApplicationReceived(vivaApplicationResponse)) {
      log.error(
        'Viva application receive failed',
        context.awsRequestId,
        'service-viva-ms-submitApplication-004',
        { vivaResponse: { ...vivaApplicationResponse } }
      );
      continue;
    }

    if (!vivaApplicationResponse?.id) {
      log.error(
        'Viva application response does not contain any workflow id',
        context.awsRequestId,
        'service-viva-ms-submitApplication-005',
        vivaApplicationResponse
      );
      continue;
    }

    const caseKeys = { PK, SK };
    const [updateError] = await to(updateVivaCase(caseKeys, vivaApplicationResponse.id));
    if (updateError) {
      log.error(
        'Failed to update Viva case',
        context.awsRequestId,
        'service-viva-ms-submitApplication-006',
        updateError
      );
      continue;
    }

    const clientUser = { personalNumber };
    const [putEventError] = await to(putVivaMsEvent.applicationReceivedSuccess(clientUser));
    if (putEventError) {
      log.error(
        'Put event ´applicationReceivedSuccess´ failed',
        context.awsRequestId,
        'service-viva-ms-submitApplication-007',
        putEventError
      );
      continue;
    }
    failedRecords.shift();
  }
  log.info(failedRecords);
  return {
    batchItemFailures: failedRecords.map(itemId => ({
      itemIdentifier: itemId,
    })),
  };
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
