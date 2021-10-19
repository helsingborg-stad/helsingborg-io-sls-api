/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import params from '../../../libs/params';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);
const VIVA_APPLICATION_RECEIVED = 'VIVA_APPLICATION_RECEIVED';

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event, context) {
  if (event.detail.dynamodb.NewImage == undefined) {
    return undefined;
  }

  const caseItem = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const { recurringFormId } = await VIVA_CASE_SSM_PARAMS;
  if (caseItem.currentFormId !== recurringFormId) {
    log.info('Current form is not an recurring form.', context.awsRequestId, null);
    return true;
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
      'Viva adapter sumbit application failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-001',
      vivaPostError
    );
    return false;
  }

  if (notApplicationReceived(vivaApplicationResponse)) {
    log.error(
      'Viva application receive failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-002',
      vivaApplicationResponse
    );
    return false;
  }

  if (!vivaApplicationResponse?.id) {
    log.error(
      'Viva application response does not contain workflow id',
      context.awsRequestId,
      'service-viva-ms-submitApplication-003',
      vivaApplicationResponse
    );
    return false;
  }

  const caseKeys = { PK, SK };
  const newCaseValues = {
    state: VIVA_APPLICATION_RECEIVED,
    workflowId: vivaApplicationResponse.id,
  };
  const [updateError, newVivaCase] = await to(updateVivaCase(caseKeys, newCaseValues));
  if (updateError) {
    log.error(
      'Database update viva case failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-004',
      updateError
    );
    return false;
  }

  const [putEventError] = await to(putVivaMsEvent.applicationReceivedSuccess({ caseKeys }));
  if (putEventError) {
    log.error(
      'Put event: applicationReceivedSuccess failed',
      context.awsRequestId,
      'service-viva-ms-submitApplication-005',
      putEventError
    );
    return false;
  }

  log.info('Updated viva case successfully', context.awsRequestId, null, newVivaCase);
  return true;
}

function notApplicationReceived(response) {
  if (response?.status !== 'OK') {
    return true;
  }

  return false;
}

function updateVivaCase(caseKeys, newValues) {
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
      ':newWorkflowId': newValues.workflowId,
      ':newState': newValues.state,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
