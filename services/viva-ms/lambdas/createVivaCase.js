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
import log from '../../../libs/logs';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event, context) {
  const userDetail = event.detail;

  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(userDetail.personalNumber)
  );
  if (applicationStatusError) {
    log.error(
      'Viva Application Status error',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-001',
      applicationStatusError
    );
    return;
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
    log.info(
      'validateApplicationStatus. No application period open.',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-002',
      applicationStatusList
    );
    return;
  }

  const [getVivaPersonError, vivaPerson] = await to(
    vivaAdapter.person.get(userDetail.personalNumber)
  );
  if (getVivaPersonError) {
    log.error(
      'Viva Get Application Request',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-003',
      getVivaPersonError
    );
    return;
  }

  if (!vivaPerson.application || !vivaPerson.application.period) {
    log.error(
      'Viva Application Period not present in response, aborting',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-004'
    );
    return;
  }

  if (!vivaPerson.application || !vivaPerson.application.workflowid) {
    log.error(
      'Viva Application WorkflowId not present in response, aborting',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-005'
    );
    return;
  }

  const [getUserCaseFilteredOnWorkflowIdError, caseItem] = await to(
    getUserCaseFilteredOnWorkflowId(vivaPerson)
  );
  if (getUserCaseFilteredOnWorkflowIdError) {
    log.error(
      'DynamoDb query on cases table failed',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-006',
      getUserCaseFilteredOnWorkflowIdError
    );

    return;
  }

  if (caseItem) {
    log.warn(
      'Case with WorkflowId already exists',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-007'
    );

    return;
  }

  const [putRecurringVivaCaseError] = await to(putRecurringVivaCase(vivaPerson, userDetail));
  if (putRecurringVivaCaseError) {
    log.warn(
      'putRecurringVivaCaseError',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-008',
      putRecurringVivaCaseError
    );
    return;
  }

  return true;
}

async function getUserCaseFilteredOnWorkflowId(vivaPerson) {
  const personalNumber = stripNonNumericalCharacters(String(vivaPerson.case.client.pnumber));
  const workflowId = vivaPerson.application.workflowid;

  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'details.workflowId = :workflowId',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':workflowId': workflowId,
    },
  };

  const [queryCasesError, queryCasesResult] = await to(dynamoDB.call('query', params));
  if (queryCasesError) {
    throw queryCasesError;
  }

  return queryCasesResult.Items[0] || null;
}

async function putRecurringVivaCase(vivaPerson, user) {
  const ssmParams = await VIVA_CASE_SSM_PARAMS;
  const { recurringFormId, completionFormId } = ssmParams;
  const applicantPersonalNumber = stripNonNumericalCharacters(
    String(vivaPerson.case.client.pnumber)
  );

  const PK = `USER#${applicantPersonalNumber}`;

  const id = uuid.v4();
  const timestampNow = Date.now();
  const initialStatus = getStatusByType('notStarted:viva');
  const workflowId = vivaPerson.application.workflowid;
  const period = {
    startDate: Date.parse(vivaPerson.application.period.start),
    endDate: Date.parse(vivaPerson.application.period.end),
  };

  const formIds = [recurringFormId, completionFormId];

  const [, formTemplates] = await to(getFormTemplates(formIds));

  const [getLastUpdatedCaseError, lastUpdatedCase] = await to(
    getLastUpdatedCase(PK, CASE_PROVIDER_VIVA)
  );
  if (getLastUpdatedCaseError) {
    throw getLastUpdatedCaseError;
  }

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
    },
  };

  let casePersonList = getCasePersonList(vivaPerson);
  caseItemPutParams.Item['persons'] = casePersonList;

  const casePersonCoApplicant = getUserByRole(casePersonList, 'coApplicant');
  if (casePersonCoApplicant) {
    caseItemPutParams.Item['GSI1'] = `USER#${casePersonCoApplicant.personalNumber}`;
  }

  const encryption = getEncryptionAttributes(vivaPerson, casePersonCoApplicant);

  casePersonList = casePersonList.map(person => {
    if (person.role === 'applicant' && person.personalNumber === user.personalNumber) {
      return { ...person, ...user };
    }
    return person;
  });

  const initialFormAttributes = {
    answers: [],
    encryption,
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

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialForms,
    casePersonList,
    formTemplates,
    lastUpdatedCase?.forms || {}
  );

  caseItemPutParams.Item.forms = prePopulatedForms;

  const [putItemError, caseItem] = await to(putItem(caseItemPutParams));
  if (putItemError) {
    throw putItemError;
  }

  return caseItem;
}

function getEncryptionAttributes(vivaPerson, casePersonCoApplicant) {
  if (casePersonCoApplicant) {
    const mainApplicantPersonalNumber = stripNonNumericalCharacters(
      String(vivaPerson.case.client.pnumber)
    );
    return {
      type: 'decrypted',
      symmetricKeyName: `${mainApplicantPersonalNumber}:${casePersonCoApplicant.personalNumber}`,
      primes: { P: 43, G: 10 },
      publicKeys: {
        [mainApplicantPersonalNumber]: null,
        [casePersonCoApplicant.personalNumber]: null,
      },
    };
  } else {
    return { type: 'decrypted' };
  }
}

function stripNonNumericalCharacters(string) {
  const matchNonNumericalCharactersRegex = /\D/g;
  return string.replace(matchNonNumericalCharactersRegex, '');
}

function getUserByRole(userList, role) {
  const user = userList.find(user => user.role == role);
  return user;
}

function getCasePersonList(vivaPerson) {
  const person = vivaPerson.case.persons?.person;
  const client = vivaPerson.case.client;
  client['type'] = 'client';

  const vivaPersonList = [];
  vivaPersonList.push(client);

  if (Array.isArray(person)) {
    vivaPersonList.push(...person);
  } else if (person != undefined) {
    vivaPersonList.push(person);
  }

  const APPLICANT = 'applicant';
  const CO_APPLICANT = 'coApplicant';
  const CHILDREN = 'children';

  const roleTranslateList = {
    client: APPLICANT,
    partner: CO_APPLICANT,
    child: CHILDREN,
  };

  const casePersonList = vivaPersonList.map(vivaPerson => {
    const { pnumber, fname: firstName, lname: lastName, type } = vivaPerson;
    const personalNumber = stripNonNumericalCharacters(String(pnumber));

    const person = {
      personalNumber,
      firstName,
      lastName,
      role: roleTranslateList[type] || 'unknown',
    };

    if ([APPLICANT, CO_APPLICANT].includes(person.role)) {
      person['hasSigned'] = false;
    }

    return person;
  });

  return casePersonList;
}

async function getFormTemplates(formIds) {
  const [getError, rawForms] = await to(
    Promise.all(
      formIds.map(formId => {
        const formGetParams = {
          TableName: config.forms.tableName,
          Key: {
            PK: `FORM#${formId}`,
          },
        };
        return dynamoDB.call('get', formGetParams);
      })
    )
  );

  if (getError) {
    console.error('(viva-ms) DynamoDb query on forms table failed', getError);
    throw getError;
  }

  const forms = rawForms.map(rawForm => rawForm.Item);

  const formsMap = forms.reduce(
    (formsMap, form) => ({
      ...formsMap,
      [form.id]: form,
    }),
    {}
  );

  return formsMap;
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
