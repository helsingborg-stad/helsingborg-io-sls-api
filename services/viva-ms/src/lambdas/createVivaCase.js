/* eslint-disable no-console */
import to from 'await-to-js';
import uuid from 'uuid';

import config from '../libs/config';

import * as dynamoDB from '../libs/dynamoDb';
import params from '../libs/params';
import log from '../libs/logs';
import { putItem } from '../libs/queries';
import { getStatusByType } from '../libs/caseStatuses';
import { populateFormWithPreviousCaseAnswers } from '../libs/formAnswers';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import {
  CASE_PROVIDER_VIVA,
  TWELVE_HOURS,
  VIVA_CASE_CREATED,
  NOT_STARTED_VIVA,
} from '../libs/constants';

import populateFormWithVivaChildren from '../helpers/populateForm';

export async function main(event, context) {
  const { clientUser, vivaPersonDetail } = event.detail;

  if (clientUser == undefined) {
    log.error(
      'Event detail attribute ´clientUser´ is undefined',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-001',
      event.detail
    );
    return false;
  }

  if (vivaPersonDetail?.application?.period == undefined) {
    log.error(
      'Viva application attribute ´period´ is undefined',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-002'
    );
    return false;
  }

  const [getCaseListOnPeriodError, caseList] = await to(getCaseListOnPeriod(vivaPersonDetail));
  if (getCaseListOnPeriodError) {
    log.error(
      'Failed to query cases table',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-003',
      getCaseListOnPeriodError
    );
    return false;
  }

  if (caseList.Items[0]) {
    log.info('Case with specified period already exists', context.awsRequestId, null);
    return false;
  }

  const [createRecurringVivaCaseError, createdVivaCase] = await to(
    createRecurringVivaCase(vivaPersonDetail, clientUser)
  );
  if (createRecurringVivaCaseError) {
    log.error(
      'Failed to create recurring Viva case',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-004',
      createRecurringVivaCaseError
    );
    return false;
  }

  log.info(
    'Viva case created successfully',
    context.awsRequestId,
    'service-viva-ms-createVivaCase-005',
    createdVivaCase
  );

  return true;
}

function getCaseListOnPeriod(vivaPerson) {
  const personalNumber = stripNonNumericalCharacters(String(vivaPerson.case.client.pnumber));
  const { startDate, endDate } = getPeriodInMilliseconds(vivaPerson);

  const casesQueryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      'details.period.startDate = :periodStartDate AND details.period.endDate = :periodEndDate',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':periodStartDate': startDate,
      ':periodEndDate': endDate,
    },
  };

  return dynamoDB.call('query', casesQueryParams);
}

async function createRecurringVivaCase(vivaPerson, user) {
  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    throw paramsReadError;
  }

  const { recurringFormId, completionFormId, randomCheckFormId } = vivaCaseSSMParams;

  const applicantPersonalNumber = stripNonNumericalCharacters(
    String(vivaPerson.case.client.pnumber)
  );

  const id = uuid.v4();
  const PK = `USER#${applicantPersonalNumber}`;
  const SK = `CASE#${id}`;
  const timestampNow = Date.now();
  const initialStatus = getStatusByType(NOT_STARTED_VIVA);
  const workflowId = vivaPerson.application?.workflowid || null;
  const period = getPeriodInMilliseconds(vivaPerson);

  const expirationTime = millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS));

  const caseItemPutParams = {
    TableName: config.cases.tableName,
    Item: {
      id,
      PK,
      SK,
      state: VIVA_CASE_CREATED,
      expirationTime,
      createdAt: timestampNow,
      updatedAt: null,
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
  const vivaChildrenList = getVivaChildren(casePersonList);
  caseItemPutParams.Item['persons'] = casePersonList;

  const casePersonCoApplicant = getUserOnRole(casePersonList, 'coApplicant');
  if (casePersonCoApplicant) {
    caseItemPutParams.Item['GSI1'] = `USER#${casePersonCoApplicant.personalNumber}`;
  }

  const formIdList = [recurringFormId, completionFormId, randomCheckFormId];
  const initialFormList = getInitialFormAttributes(formIdList, vivaPerson);

  casePersonList = casePersonList.map(person => {
    if (person.role === 'applicant' && person.personalNumber === user.personalNumber) {
      const personApplicantExtendedInfo = { ...person, ...user };
      return personApplicantExtendedInfo;
    }
    return person;
  });

  const [, formTemplates] = await to(getFormTemplates(formIdList));

  const [getLastUpdatedCaseError, lastUpdatedCase] = await to(getLastUpdatedCase(PK));
  if (getLastUpdatedCaseError) {
    throw getLastUpdatedCaseError;
  }

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialFormList,
    casePersonList,
    formTemplates,
    lastUpdatedCase?.forms || {}
  );

  if (vivaChildrenList.length > 0) {
    const recurringFormPrePopulated = prePopulatedForms[recurringFormId];
    const recurringFormWithVivaChildren = populateFormWithVivaChildren(
      recurringFormPrePopulated,
      formTemplates[recurringFormId],
      vivaChildrenList
    );
    prePopulatedForms[recurringFormId] = recurringFormWithVivaChildren;
  }

  caseItemPutParams.Item['forms'] = prePopulatedForms;

  const [putItemError, createdCaseItem] = await to(putItem(caseItemPutParams));
  if (putItemError) {
    throw putItemError;
  }

  return createdCaseItem;
}

function getVivaChildren(casePersonList) {
  const childrenList = casePersonList.filter(person => person.role === 'children');
  return childrenList;
}

function getInitialFormAttributes(formIdList, vivaPerson) {
  const encryption = getEncryptionAttributes(vivaPerson);
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

  const [recurringFormId, completionFormId, randomCheckFormId] = formIdList;

  const initialFormList = {
    [recurringFormId]: initialFormAttributes,
    [completionFormId]: initialFormAttributes,
    [randomCheckFormId]: initialFormAttributes,
  };

  return initialFormList;
}

function getEncryptionAttributes(vivaPerson) {
  const casePersonList = getCasePersonList(vivaPerson);
  const casePersonCoApplicant = getUserOnRole(casePersonList, 'coApplicant');

  if (!casePersonCoApplicant) {
    const applicantEncryptionAttributes = { type: 'decrypted' };
    return applicantEncryptionAttributes;
  }

  const mainApplicantPersonalNumber = stripNonNumericalCharacters(
    String(vivaPerson.case.client.pnumber)
  );

  const encryptionAttributes = {
    type: 'decrypted',
    symmetricKeyName: `${mainApplicantPersonalNumber}:${
      casePersonCoApplicant.personalNumber
    }:${uuid.v4()}`,
    primes: {
      P: 43,
      G: 10,
    },
    publicKeys: {
      [mainApplicantPersonalNumber]: null,
      [casePersonCoApplicant.personalNumber]: null,
    },
  };

  return encryptionAttributes;
}

function getUserOnRole(userList, role) {
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

  const roleType = {
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
      role: roleType[type] || 'unknown',
    };

    if ([APPLICANT, CO_APPLICANT].includes(person.role)) {
      person['hasSigned'] = false;
    }

    return person;
  });

  return casePersonList;
}

async function getFormTemplates(formIdList) {
  const [getError, rawForms] = await to(
    Promise.all(
      formIdList.map(formId => {
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

async function getLastUpdatedCase(PK) {
  const lastUpdatedCaseQueryParams = {
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
      ':provider': CASE_PROVIDER_VIVA,
    },
  };

  const [queryError, queryResponse] = await to(dynamoDB.call('query', lastUpdatedCaseQueryParams));
  if (queryError) {
    throw queryError;
  }

  const sortedCases = queryResponse.Items.sort((a, b) => b.updatedAt - a.updatedAt);
  return sortedCases?.[0] || {};
}

function stripNonNumericalCharacters(string) {
  const matchNonNumericalCharactersRegex = /\D/g;
  return string.replace(matchNonNumericalCharactersRegex, '');
}

function getPeriodInMilliseconds(vivaPerson) {
  const period = {
    startDate: Date.parse(vivaPerson.application.period.start),
    endDate: Date.parse(vivaPerson.application.period.end),
  };

  return period;
}
