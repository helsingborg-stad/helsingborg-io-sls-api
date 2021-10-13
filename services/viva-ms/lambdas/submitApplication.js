/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import params from '../../../libs/params';
import { STATE } from '../../../libs/constants';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event, context) {
  console.log('event', event);
  if (event.detail.dynamodb.NewImage == undefined) {
    return undefined;
  }

  const caseItem = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const { recurringFormId } = await VIVA_CASE_SSM_PARAMS;
  if (caseItem.currentFormId !== recurringFormId) {
    return true;
  }

  const { PK, SK, pdf: pdfBinaryBuffer } = caseItem;
  const personalNumber = PK.substring(5);

  const [vivaPostError, vivaApplicationResponse] = await to(
    vivaAdapter.application.post({
      applicationType: 'recurrent',
      personalNumber,
      workflowId: caseItem.details?.workflowId || '',
      answers: caseItem[recurringFormId].answers,
      rawData: pdfBinaryBuffer.toString(),
      rawDataType: 'pdf',
    })
  );
  if (vivaPostError) {
    log.error(
      'Viva adapter sumbit application failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-001',
      vivaPostError
    );
    return false;
  }
  console.log('vivaApplicationResponse', vivaApplicationResponse);

  if (!isApplicationReceived(vivaApplicationResponse)) {
    log.error(
      'Viva application receive failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-002',
      vivaApplicationResponse
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.applicationReceivedSuccess({
      user: personalNumber,
      vivaApplicationResponse: vivaApplicationResponse,
    })
  );
  if (putEventError) {
    return console.error('(Viva-ms: submitApplication) putEventError.', putEventError);
  }

  const updateVivaCaseAttribute = {
    caseKeys: {
      PK,
      SK,
    },
    state: STATE.SUBMIT.RECEIVED,
    workflowId: undefined,
  };
  const [databaseUpdateError, newVivaCase] = to(databaseUpdateVivaCase(updateVivaCaseAttribute));
  if (databaseUpdateError) {
    log.error(
      'Database update viva case failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-003',
      databaseUpdateError
    );
    return false;
  }

  log.info('Updated viva case successyfully', context.awsRequestId, null, newVivaCase);
  return true;
}

function isApplicationReceived(response) {
  if (response?.status !== 'OK') {
    return false;
  }

  return true;
}

function databaseUpdateVivaCase(attribute) {
  const { caseKeys, workflowId, state } = attribute;

  const params = {
    TableName: config.cases.tableName,
    Key: caseKeys,
    UpdateExpression: 'SET #state = :newState, #details.#workflowId = :newWorkflowId',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#details': 'details',
      '#workflowId': 'workflowId',
    },
    ExpressionAttributeValues: {
      ':newWorkflowId': workflowId || '123',
      ':newState': state,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
