/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import params from '../../../libs/params';
import log from '../../../libs/logs';
import { getStatusByType } from '../../../libs/caseStatuses';
import {
  VIVA_COMPLETION_REQUIRED,
  VIVA_COMPLETION_RANDOM_CHECK_REQUIRED,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_RANDOM_CHECK_REQUIRED_VIVA,
} from '../../../libs/constants';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
  const { personalNumber } = event.detail.user;

  const [getWorkflowCompletionsError, workflowCompletions] = await to(
    getVivaWorkflowCompletions(personalNumber)
  );
  if (getWorkflowCompletionsError) {
    log.error(
      'Error getting Viva workflow completions',
      context.awsRequestId,
      'service-viva-ms-setCaseCompletions-001',
      getWorkflowCompletionsError
    );
    return false;
  }

  console.log('workflowCompletions', workflowCompletions);

  // const [paramsReadError, vivaCaseSSMParams] = await to(
  //   params.read(config.cases.providers.viva.envsKeyName)
  // );
  // if (paramsReadError) {
  // log.error(
  //   'Read ssm params [config.cases.providers.viva.envsKeyName] failed',
  //   context.awsRequestId,
  //   'service-viva-ms-setCaseCompletions-001',
  //   paramsReadError
  // );
  // return false;
}

async function getVivaWorkflowCompletions(personalNumber) {
  const [getLatestWorkflowIdError, workflowId] = await to(getLatestVivaWorkflowId(personalNumber));
  if (getLatestWorkflowIdError) {
    throw getLatestWorkflowIdError;
  }

  const [getWorkflowCompletionsError, getCompletionsResponse] = await to(
    vivaAdapter.workflow.getCompletions({ personalNumber, workflowId })
  );
  if (getWorkflowCompletionsError) {
    throw getWorkflowCompletionsError;
  }

  console.log('getCompletionsResponse', getCompletionsResponse);

  return getCompletionsResponse;
}

async function getLatestVivaWorkflowId(personalNumber) {
  const [getLatestError, getLatestResponse] = await to(
    vivaAdapter.workflow.getLatest(personalNumber)
  );
  if (getLatestError) {
    throw getLatestError;
  }

  return getLatestResponse.attributes.workflowid;
}

// async function updateCaseCompletionAttributes(keys, newCurrentFormId) {
//   const newCompletionStatus = getStatusByType(ACTIVE_COMPLETION_RANDOM_CHECK_REQUIRED_VIVA);
//   const [getCaseError, { persons }] = await to(getCase(keys));
//   if (getCaseError) {
//     throw getCaseError;
//   }
//   const newPersons = persons ? resetApplicantSignature(persons) : [];

//   const params = {
//     TableName: config.cases.tableName,
//     Key: {
//       PK: keys.PK,
//       SK: keys.SK,
//     },
//     UpdateExpression:
//       'SET #currentFormId = :newCurrentFormId, #status = :newCompletionStatus, #persons = :newPersons, #state = :newState',
//     ExpressionAttributeNames: {
//       '#currentFormId': 'currentFormId',
//       '#status': 'status',
//       '#persons': 'persons',
//       '#state': 'state',
//     },
//     ExpressionAttributeValues: {
//       ':newCurrentFormId': newCurrentFormId,
//       ':newCompletionStatus': newCompletionStatus,
//       ':newPersons': newPersons,
//       ':newState': VIVA_COMPLETION_RANDOM_CHECK_REQUIRED,
//     },
//     ReturnValues: 'UPDATED_NEW',
//   };

//   return dynamoDb.call('update', params);
// }

// async function getCase(keys) {
//   const params = {
//     TableName: config.cases.tableName,
//     KeyConditionExpression: 'PK = :pk AND SK = :sk',
//     ExpressionAttributeValues: {
//       ':pk': keys.PK,
//       ':sk': keys.SK,
//     },
//   };

//   const [queryError, queryResponse] = await to(dynamoDb.call('query', params));
//   if (queryError) {
//     throw queryError;
//   }

//   const caseItem = queryResponse.Items.find(item => item.SK === keys.SK);
//   if (!caseItem) {
//     throw `Case with sort key: ${keys.SK} not found`;
//   }

//   return caseItem;
// }

// function resetApplicantSignature(persons) {
//   return persons.map(person => {
//     if (person.role === 'applicant' && person.hasSigned) {
//       person.hasSigned = false;
//     }
//     return person;
//   });
// }
