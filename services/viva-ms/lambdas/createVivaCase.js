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

  const [getPersonError, vivaPerson] = await to(vivaAdapter.person.get(user.personalNumber));
  if (getPersonError) {
    return console.error('(Viva-ms) Viva Get Application Request', getPersonError);
  }

  if (!vivaPerson.application || !vivaPerson.application.period) {
    return console.error('(Viva-ms) Viva Application Period not present in response, aborting');
  }

  if (!vivaPerson.application || !vivaPerson.application.workflowid) {
    return console.error('(Viva-ms) Viva Application WorkflowId not present in response, aborting');
  }

  const PK = `USER#${user.personalNumber}`;
  const [queryCasesError, queryCaseItems] = await to(
    queryCasesWithWorkflowId(PK, vivaPerson.application.workflowid)
  );
  if (queryCasesError) {
    return console.error('(Viva-ms) DynamoDb query on cases table failed', queryCasesError);
  }

  if (queryCaseItems.length > 0) {
    return console.log('(Viva-ms) Case with WorkflowId already exists');
  }

  const period = {
    startDate: Date.parse(vivaPerson.application.period.start),
    endDate: Date.parse(vivaPerson.application.period.end),
  };

  const [putItemError] = await to(
    putRecurringVivaCase(PK, vivaPerson.application.workflowid, period)
  );
  if (putItemError) {
    return console.error('(viva-ms) syncApplicationStatus', putItemError);
  }

  return true;
}

async function queryCasesWithWorkflowId(PK, workflowId) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':workflowId': workflowId,
    },
  };

  const [dynamoQueryError, queryCasesResult] = await to(dynamoDB.call('query', params));
  if (dynamoQueryError) {
    throw dynamoQueryError;
  }

  return queryCasesResult.Items;
}

async function putRecurringVivaCase(PK, workflowId, period) {
  const ssmParams = await VIVA_CASE_SSM_PARAMS;
  const { recurringFormId, completionFormId } = ssmParams;
  const id = uuid.v4();
  const timestampNow = Date.now();
  const initialStatus = getStatusByType('notStarted:viva');

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

  const [userError, user] = await to(getUser(PK));
  if (userError) {
    console.error('(cases-api) DynamoDb query on users table failed', userError);
    throw userError;
  }
  const [, formTemplates] = await to(getFormTemplates(initialForms));

  const [previousCaseError, previousCase] = await to(getLastUpdatedCase(PK, CASE_PROVIDER_VIVA));
  if (previousCaseError) {
    console.error('(cases-api) DynamoDb query on cases table failed', previousCaseError);
    throw previousCaseError;
  }

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialForms,
    user,
    formTemplates,
    previousCase?.forms || {}
  );

  const expirationTime = millisecondsToSeconds(getFutureTimestamp(DELETE_VIVA_CASE_AFTER_12_HOURS));

  const putItemParams = {
    TableName: config.cases.tableName,
    Item: {
      id,
      PK,
      expirationTime,
      SK: `${PK}#CASE#${id}`,
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

  const [putItemError, caseItem] = await to(putItem(putItemParams));
  if (putItemError) {
    throw putItemError;
  }

  return caseItem;
}

async function getUser(PK) {
  const personalNumber = PK.substring(5);
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [error, dbResponse] = await to(dynamoDB.call('get', params));
  if (error) {
    throwError(error.statusCode, error.message);
  }

  return dbResponse.Item;
}

async function getFormTemplates(forms) {
  const formTemplates = {};
  for (const key of Object.keys(forms)) {
    const params = {
      TableName: config.forms.tableName,
      Key: {
        PK: `FORM#${key}`,
      },
    };
    const [error, dbResponse] = await to(dynamoDB.call('get', params));

    if (error) {
      console.error('(cases-api) DynamoDb query on forms table failed', error);
      continue;
    }
    formTemplates[key] = dbResponse.Item;
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
