/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import params from '../../../libs/params';
import log from '../../../libs/logs';
import { getStatusByType } from '../../../libs/caseStatuses';
import { VIVA_COMPLETION_REQUIRED, ACTIVE_COMPLETION_REQUIRED_VIVA } from '../../../libs/constants';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { caseKeys } = event.detail;

  const personalNumber = caseKeys.PK.substring(5);
  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(personalNumber)
  );
  if (applicationStatusError) {
    log.error(
      'Viva application status failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-001',
      applicationStatusError
    );
    return false;
  }

  /**
   * The Combination of Status Codes 64, 128, 256, 512
   * determines if a VIVA Application Workflow requires completion
   * 64 - Completion is required,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const completionStatusCodes = [64, 128, 256, 512];
  if (!validateApplicationStatus(applicationStatusList, completionStatusCodes)) {
    log.info(
      'No Viva completion status(64) found',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-002',
      applicationStatusList
    );
    return true;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-003',
      paramsReadError
    );
    return false;
  }

  const [updateCaseError, caseItem] = await to(
    updateCaseCompletionAttributes(caseKeys, vivaCaseSSMParams.completionFormId)
  );
  if (updateCaseError) {
    log.error(
      'Update case completion attributes failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-004',
      updateCaseError
    );
    return false;
  }

  log.info(
    'Successful update completion attributes on case',
    context.awsRequestId,
    'service-viva-ms-checkCompletion-005',
    caseItem
  );

  const [putEventError] = await to(putVivaMsEvent.checkCompletionSuccess({ caseKeys }));
  if (putEventError) {
    log.error(
      'Put event ´checkCompletionSuccess´ failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-006',
      putEventError
    );
    return false;
  }

  return true;
}

async function updateCaseCompletionAttributes(keys, newCurrentFormId) {
  const newCompletionStatus = getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
  const [getCaseError, { persons }] = await to(getCase(keys));
  if (getCaseError) {
    throw getCaseError;
  }
  const newPersons = persons ? resetApplicantSignature(persons) : [];

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #currentFormId = :newCurrentFormId, #status = :newCompletionStatus, #persons = :newPersons, #state = :newState',
    ExpressionAttributeNames: {
      '#currentFormId': 'currentFormId',
      '#status': 'status',
      '#persons': 'persons',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newCurrentFormId': newCurrentFormId,
      ':newCompletionStatus': newCompletionStatus,
      ':newPersons': newPersons,
      ':newState': VIVA_COMPLETION_REQUIRED,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}

async function getCase(keys) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': keys.PK,
      ':sk': keys.SK,
    },
  };

  const [error, dbResponse] = await to(dynamoDb.call('query', params));
  if (error) {
    throw error;
  }

  const caseItem = dbResponse.Items.find(item => item.PK === keys.PK);
  if (!caseItem) {
    throw `Case with sort key: ${keys.SK} not found`;
  }

  return caseItem;
}

function resetApplicantSignature(persons) {
  return persons.map(person => {
    if (person.role === 'applicant' && person.hasSigned) {
      person.hasSigned = false;
    }
    return person;
  });
}
