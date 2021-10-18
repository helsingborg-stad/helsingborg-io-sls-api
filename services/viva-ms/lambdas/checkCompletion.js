/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import params from '../../../libs/params';
// import log from '../../../libs/logs';
import * as dynamoDb from '../../../libs/dynamoDb';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import { getStatusByType, statusTypes } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);
const VIVA_COMPLETION_REQUIRED = 'VIVA_COMPLETION_REQUIRED';

export async function main(event) {
  const { caseKeys } = event.detail;

  const personalNumber = caseKeys.PK.substring(5);
  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(personalNumber)
  );
  if (applicationStatusError) {
    return console.error(
      '(Viva-ms; checkCompletion) applicationStatusError.',
      applicationStatusError
    );
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
    console.info(
      '(Viva-ms: checkCompletion) No completion status(64) found in viva adapter response.',
      applicationStatusList
    );
    return await putCheckCompletionEvent(caseKeys);
  }

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  const [updateCaseError, caseItem] = await to(
    updateCaseCompletionAttributes(caseKeys, vivaCaseSSMParams.completionFormId)
  );

  if (updateCaseError) {
    return console.error('(Viva-ms: checkCompletion) updateCaseError.', updateCaseError);
  }

  console.log(
    '(viva-ms: checkCompletion) Updated case with completion data successfully.',
    caseItem
  );

  return await putCheckCompletionEvent(caseKeys);
}

async function putCheckCompletionEvent(caseKeys) {
  const [putEventError] = await to(
    putEvent({ caseKeys }, 'vivaMsCheckCompletionSuccess', 'vivaMs.checkCompletion')
  );
  if (putEventError) {
    return console.error('(Viva-ms: checkCompletion) putEventError.', putEventError);
  }

  return true;
}

async function updateCaseCompletionAttributes(keys, currentFormId) {
  const completionStatus = getStatusByType(statusTypes.ACTIVE_COMPLETION_REQUIRED_VIVA);
  const [getCaseError, { persons }] = await to(getCase(keys));
  if (getCaseError) {
    throw getCaseError;
  }
  const newPersons = persons ? resetApplicantSignature(persons) : [];

  const params = {
    TableName: config.cases.tableName,
    Key: keys,
    UpdateExpression:
      'SET #currentFormId = :newCurrentFormId, #status = :newCompletionStatus, #persons = :newPersons, #state = :newState',
    ExpressionAttributeNames: {
      '#currentFormId': 'currentFormId',
      '#status': 'status',
      '#persons': 'persons',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newCurrentFormId': currentFormId,
      ':newCompletionStatus': completionStatus,
      ':newPersons': newPersons,
      ':newState': VIVA_COMPLETION_REQUIRED,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  const [updateCaseError, caseItem] = await to(dynamoDb.call('update', params));
  if (updateCaseError) {
    throw updateCaseError;
  }

  return caseItem;
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
    throw 'Case not found';
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
