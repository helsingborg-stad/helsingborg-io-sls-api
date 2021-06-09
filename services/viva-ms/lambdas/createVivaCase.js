/* eslint-disable no-console */
import to from 'await-to-js';
import uuid from 'uuid';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import { putItem } from '../../../libs/queries';
import * as dynamoDB from '../../../libs/dynamoDb';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';
import { getStatusByType } from '../../../libs/caseStatuses';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import { populateFormWithPreviousCaseAnswers } from '../../../libs/formAnswers';

import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import { DELETE_VIVA_CASE_AFTER_12_HOURS } from '../../../libs/constants';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const { user } = event.detail;

  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(user.personalNumber)
  );
  if (applicationStatusError) {
    return console.error('(Viva-ms) Viva Application Status', applicationStatusError);
  }

  /**
   * The Combination of Status Codes 1, 128, 256, 512
   * determines if a VIVA Application Workflow is open for applicant.
   * 1 - Application is open for applicant,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const requiredStatusCodes = [1, 128, 256, 512];
  if (!validateApplicationStatus(applicationStatusList, requiredStatusCodes)) {
    return console.info(
      '(Viva-ms) syncApplicationStatus',
      'Application period is not open',
      applicationStatusList
    );
  }

  const [getVivaPersonError, vivaPerson] = await to(vivaAdapter.person.get(user.personalNumber));
  if (getVivaPersonError) {
    return console.error('(Viva-ms) Viva Get Application Request', getVivaPersonError);
  }

  if (!vivaPerson.application || !vivaPerson.application.period) {
    return console.error('(Viva-ms) Viva Application Period not present in response, aborting');
  }

  if (!vivaPerson.application || !vivaPerson.application.workflowid) {
    return console.error('(Viva-ms) Viva Application WorkflowId not present in response, aborting');
  }

  const [getUserCaseFilteredOnWorkflowIdError, caseItem] = await to(
    getUserCaseFilteredOnWorkflowId(vivaPerson)
  );
  if (getUserCaseFilteredOnWorkflowIdError) {
    return console.error(
      '(Viva-ms) DynamoDb query on cases table failed',
      getUserCaseFilteredOnWorkflowIdError
    );
  }

  if (caseItem.length > 0) {
    return console.log('(Viva-ms) Case with WorkflowId already exists');
  }

  const [putRecurringVivaCaseError] = await to(putRecurringVivaCase(vivaPerson));
  if (putRecurringVivaCaseError) {
    return console.error('(viva-ms) putRecurringVivaCaseError', putRecurringVivaCaseError);
  }

  return true;
}

async function getUserCaseFilteredOnWorkflowId(vivaPerson) {
  const personalNumber = String(vivaPerson.case.client.pnumber).replace(/\D/g, '');
  const workflowId = vivaPerson.application.workflowid;

  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':workflowId': workflowId,
    },
    Limit: 1,
  };

  const [queryCasesError, queryCasesResult] = await to(dynamoDB.call('query', params));
  if (queryCasesError) {
    throw queryCasesError;
  }

  return queryCasesResult.Items;
}

async function putRecurringVivaCase(vivaPerson) {
  const ssmParams = await VIVA_CASE_SSM_PARAMS;
  const { recurringFormId, completionFormId } = ssmParams;
  const applicantPersonalNumber = String(vivaPerson.case.client.pnumber).replace(/\D/g, '');
  const PK = `USER#${applicantPersonalNumber}`;

  const id = uuid.v4();
  const timestampNow = Date.now();
  const initialStatus = getStatusByType('notStarted:viva');
  const workflowId = vivaPerson.application.workflowid;
  const period = {
    startDate: Date.parse(vivaPerson.application.period.start),
    endDate: Date.parse(vivaPerson.application.period.end),
  };

  const initialFormAttributes = {
    answers: [],
    currentPosition: {
      currentMainStep: 1,
      currentMainStepIndex: 0,
      index: 0,
      level: 0,
    },
  };

  const initialForms = {
    [recurringFormId]: initialFormAttributes,
    [completionFormId]: initialFormAttributes,
  };

  const [getUserError, user] = await to(getUser(PK));
  if (getUserError) {
    throw getUserError;
  }

  const [, formTemplates] = await to(getFormTemplates(initialForms));

  const [getLastUpdatedCaseError, lastUpdatedCase] = await to(
    getLastUpdatedCase(PK, CASE_PROVIDER_VIVA)
  );
  if (getLastUpdatedCaseError) {
    throw getLastUpdatedCaseError;
  }

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialForms,
    user,
    formTemplates,
    lastUpdatedCase?.forms || {}
  );

  const expirationTime = millisecondsToSeconds(getFutureTimestamp(DELETE_VIVA_CASE_AFTER_12_HOURS));

  const caseItemPutParams = {
    TableName: config.cases.tableName,
    Item: {
      PK,
      SK: `CASE#${id}`,
      id,
      expirationTime,
      createdAt: timestampNow,
      updatedAt: timestampNow,
      status: initialStatus,
      provider: CASE_PROVIDER_VIVA,
      details: {
        workflowId,
        period,
      },
      currentFormId: recurringFormId,
      forms: prePopulatedForms,
    },
  };

  const casePersonList = getCasePersonList(vivaPerson);
  caseItemPutParams['persons'] = casePersonList;

  const casePersonCoApplicant = getUserByRole(casePersonList, 'coApplicant');
  if (casePersonCoApplicant) {
    caseItemPutParams['GSI1'] = `USER#${casePersonCoApplicant}`;
  }

  const [putItemError, caseItem] = await to(putItem(caseItemPutParams));
  if (putItemError) {
    throw putItemError;
  }

  return caseItem;
}

function getUserByRole(userList, role) {
  const user = userList.find(user => user.role == role);
  return user;
}

function getCasePersonList(vivaPerson) {
  const { person } = vivaPerson.case.persons?.person;
  const { client } = vivaPerson.case.client;
  client['type'] = 'client';

  const vivaPersonList = [];
  vivaPersonList.push(client);

  if (Array.isArray(person)) {
    vivaPersonList.push(...person);
  } else if (person != undefined) {
    vivaPersonList.push(person);
  }

  const roleTranslateList = {
    client: 'applicant',
    partner: 'coAppalicant',
    child: 'children',
  };

  const casePersonList = vivaPersonList.map(person => {
    const { pnumber: personalNumber, fname: firstName, lname: lastName, type } = person;
    const role = Object.keys(roleTranslateList).includes(type) && roleTranslateList[type];

    return {
      personalNumber,
      firstName,
      lastName,
      role,
    };
  });

  return casePersonList;
}

async function getUser(PK) {
  const personalNumber = PK.substring(5);
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [getError, getResult] = await to(dynamoDB.call('get', params));
  if (getError) {
    throw getError;
  }

  return getResult.Item;
}

async function getFormTemplates(forms) {
  const formTemplates = {};

  for (const formId of Object.keys(forms)) {
    const formGetParams = {
      TableName: config.forms.tableName,
      Key: {
        PK: `FORM#${formId}`,
      },
    };

    const [getError, getResult] = await to(dynamoDB.call('get', formGetParams));
    if (getError) {
      console.error('(viva-ms) DynamoDb query on forms table failed', getError);
      continue;
    }

    formTemplates[formId] = getResult.Item;
  }

  return formTemplates;
}

async function getLastUpdatedCase(PK, provider) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed) and #provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
      '#provider': 'provider',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeClosed': 'closed',
      ':provider': provider,
    },
  };

  const [error, dbResponse] = await to(dynamoDB.call('query', params));
  if (error) {
    throwError(error.statusCode, error.message);
  }

  const sortedCases = dbResponse.Items.sort((a, b) => b.updatedAt - a.updatedAt);

  return sortedCases?.[0] || {};
}
