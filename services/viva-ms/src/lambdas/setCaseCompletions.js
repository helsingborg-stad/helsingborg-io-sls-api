import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import params from '../libs/params';
import log from '../libs/logs';
import { getItem as getCase } from '../libs/queries';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';

export async function main(event, context) {
  const { caseKeys } = event.detail;

  const [getCaseError, { Item: caseItem }] = await getCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseError) {
    log.error(
      'Get case failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-025',
      getCaseError
    );
    return false;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params [config.cases.providers.viva.envsKeyName] failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-020',
      paramsReadError
    );
    return false;
  }

  const { completions } = caseItem.details;
  const caseUpdateAttributes = {
    newStatus: completionsHelper.get.status(completions),
    newState: completionsHelper.get.state(completions),
    newCurrentFormId: completionsHelper.get.formId(vivaCaseSSMParams, completions),
    newPersons: resetCasePersonsApplicantSignature(caseItem),
  };
  const [updateCaseError, updatedCaseItem] = await to(updateCase(caseKeys, caseUpdateAttributes));
  if (updateCaseError) {
    log.error(
      'Update case completion attributes failed',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-030',
      updateCaseError
    );
    return false;
  }

  const [putEventError] = await to(putVivaMsEvent.setCaseCompletionsSuccess(event.detail));
  if (putEventError) {
    log.error(
      'Error put event [setCaseCompletionsSuccess]',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-040',
      putEventError
    );
    return false;
  }

  log.info(
    'Successfully updated case',
    context.awsRequestId,
    'service-viva-ms-setCaseCompletions-050',
    updatedCaseItem.id
  );

  return true;
}

function updateCase(keys, caseUpdateAttributes) {
  const { newStatus, newState, newCurrentFormId, newPersons } = caseUpdateAttributes;

  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #currentFormId = :newCurrentFormId, #status = :newStatus, #persons = :newPersons, #state = :newState',
    ExpressionAttributeNames: {
      '#currentFormId': 'currentFormId',
      '#status': 'status',
      '#persons': 'persons',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newCurrentFormId': newCurrentFormId,
      ':newPersons': newPersons,
      ':newStatus': newStatus,
      ':newState': newState,
    },
    ProjectionExpression: 'id',
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

function resetCasePersonsApplicantSignature(caseItem) {
  const { persons = [] } = caseItem;
  return persons.map(person => {
    if (person.role === 'applicant' && person.hasSigned) {
      person.hasSigned = false;
    }
    return person;
  });
}
