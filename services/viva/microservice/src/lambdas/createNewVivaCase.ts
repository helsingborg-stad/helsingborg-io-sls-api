import uuid from 'uuid';

import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import { populateFormWithPreviousCaseAnswers } from '../libs/formAnswers';
import { getStatusByType } from '../libs/caseStatuses';
import * as dynamoDb from '../libs/dynamoDb';
import { putItem } from '../libs/queries';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import { isFormNewApplication } from '../helpers/newApplication';
import { getFormTemplates } from '../helpers/dynamoDb';
import createCaseHelper from '../helpers/createCase';

import {
  CASE_PROVIDER_VIVA,
  TWELVE_HOURS,
  VIVA_CASE_CREATED,
  NEW_APPLICATION_VIVA,
} from '../libs/constants';

import type { CaseUser, CaseItem, CaseForm, CaseStatus, CasePerson } from '../types/caseItem';
import type { VivaParametersResponse } from '../types/ssmParameters';
import { CasePersonRole } from '../types/caseItem';

interface LambdaDetail {
  user: CaseUser;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  createCase: typeof putItem;
  getFormTemplateId: () => Promise<VivaParametersResponse>;
  getApplicantCases: (personalNumber: string) => Promise<CaseItem[]>;
  getCoApplicantCases: (personalNumber: string) => Promise<CaseItem[]>;
  getTemplates: typeof getFormTemplates;
  isApprovedForNewApplication: (personalNumber: string) => Promise<boolean>;
}

function getFormTemplateId(): Promise<VivaParametersResponse> {
  return params.read(config.cases.providers.viva.envsKeyName);
}

async function isApprovedForNewApplication(personalNumber: string): Promise<boolean> {
  const { approvedNewApplicationUsers = [] } = await params.read(
    config.vivaNewApplication.envsKeyName
  );

  // If the list of approved users is empty, all users are approved.
  if (approvedNewApplicationUsers.length === 0) {
    return true;
  }

  return approvedNewApplicationUsers.includes(personalNumber);
}

async function getApplicantCases(personalNumber: string): Promise<CaseItem[]> {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    Select: 'SPECIFIC_ATTRIBUTES',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
    },
    ProjectionExpression: '#status, currentFormId',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  return (await dynamoDb.call('query', queryParams)).Items;
}

async function getCoApplicantCases(personalNumber: string): Promise<CaseItem[]> {
  const GSI1 = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1 AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':sk': SK,
    },
    Select: 'SPECIFIC_ATTRIBUTES',
    ProjectionExpression: '#status, currentFormId',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  return (await dynamoDb.call('query', queryParams)).Items;
}

function isOpenCase(caseItem: CaseItem): boolean {
  return !caseItem.status.type.includes('closed');
}

function isCaseNewApplication(formId: VivaParametersResponse): (caseItem: CaseItem) => boolean {
  return ({ currentFormId }) => isFormNewApplication(formId, currentFormId);
}

export async function createNewVivaCase(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user } = input.detail;

  const isApplicantApproved = await dependencies.isApprovedForNewApplication(user.personalNumber);
  if (!isApplicantApproved) {
    return false;
  }

  const formIdCollection = await dependencies.getFormTemplateId();

  const cases = (
    await Promise.all([
      dependencies.getApplicantCases(user.personalNumber),
      dependencies.getCoApplicantCases(user.personalNumber),
    ])
  ).flat();

  const newApplicationCases = cases.filter(isCaseNewApplication(formIdCollection));
  const hasOpenedNewApplicationCases = newApplicationCases.filter(isOpenCase).length > 0;

  if (hasOpenedNewApplicationCases) {
    return false;
  }

  const formIdList = [
    formIdCollection.newApplicationFormId,
    formIdCollection.newApplicationCompletionFormId,
    formIdCollection.newApplicationRandomCheckFormId,
  ];

  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes();
  const initialFormList = createCaseHelper.getInitialFormAttributes(
    formIdList,
    initialFormEncryption
  );

  const id = uuid.v4();
  const PK = `USER#${user.personalNumber}`;
  const SK = `CASE#${id}`;
  const timestampNow = Date.now();
  const expirationTime = millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS));
  const initialStatus: CaseStatus = getStatusByType(NEW_APPLICATION_VIVA);
  const initialPersonList: CasePerson[] = [createCaseHelper.createCaseApplicantPerson(user)];

  const extendedCasePersonList = initialPersonList.map(person => {
    if (person.role === CasePersonRole.Applicant && person.personalNumber === user.personalNumber) {
      return { ...user, ...person };
    }
    return person;
  });

  const formTemplates = await dependencies.getTemplates(formIdList);

  const prePopulatedForms: Record<string, CaseForm> = populateFormWithPreviousCaseAnswers({
    forms: initialFormList,
    applicants: extendedCasePersonList,
    formTemplates,
    previousForms: {},
  });

  const newVivaCaseItem: CaseItem = {
    id,
    PK,
    SK,
    state: VIVA_CASE_CREATED,
    expirationTime,
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    forms: prePopulatedForms,
    provider: CASE_PROVIDER_VIVA,
    persons: initialPersonList,
    details: {
      vivaCaseId: null,
      workflowId: null,
      period: {
        startDate: createCaseHelper.createPeriodStartDate(),
        endDate: 0,
      },
      completions: null,
    },
    currentFormId: formIdCollection.newApplicationFormId,
  };

  await dependencies.createCase({
    TableName: config.cases.tableName,
    Item: newVivaCaseItem,
  });

  log.writeInfo(`New case with id: ${newVivaCaseItem.id} successfully created`);
  return true;
}

export const main = log.wrap(event => {
  return createNewVivaCase(event, {
    createCase: putItem,
    getFormTemplateId,
    getApplicantCases,
    getCoApplicantCases,
    getTemplates: getFormTemplates,
    isApprovedForNewApplication,
  });
});
