import uuid from 'uuid';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import params from '../libs/params';
import log from '../libs/logs';
import { putItem } from '../libs/queries';
import { populateFormWithPreviousCaseAnswers } from '../libs/formAnswers';
import { getStatusByType } from '../libs/caseStatuses';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import {
  CASE_PROVIDER_VIVA,
  TWELVE_HOURS,
  VIVA_CASE_CREATED,
  NEW_APPLICATION_VIVA,
} from '../libs/constants';

import createCaseHelper from '../helpers/createCase';
import { getFormTemplates } from '../helpers/dynamoDb';
import { VivaParametersResponse } from '../types/ssmParameters';
import { CasePersonRole } from '../types/caseItem';
import type { CaseUser, CaseItem, CaseForm, CaseStatus, CasePerson } from '../types/caseItem';

interface GetUserCaseListResponse {
  Count: number;
}

interface LambdaDetail {
  user: CaseUser;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  createCase: typeof putItem;
  getFormTemplateId: () => Promise<VivaParametersResponse>;
  getUserCasesCount: (personalNumber: string) => Promise<GetUserCaseListResponse>;
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

function getUserCasesCount(personalNumber: string): Promise<GetUserCaseListResponse> {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
    },
    Select: 'COUNT',
  };

  return dynamoDb.call('query', queryParams);
}

export async function createNewVivaCase(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user } = input.detail;

  const isApplicantApproved = await dependencies.isApprovedForNewApplication(user.personalNumber);
  if (!isApplicantApproved) {
    return true;
  }

  const { Count } = await dependencies.getUserCasesCount(user.personalNumber);
  if (Count > 0) {
    return true;
  }

  const { newApplicationFormId, newApplicationCompletionFormId, newApplicationRandomCheckFormId } =
    await dependencies.getFormTemplateId();

  const formIdList = [
    newApplicationFormId,
    newApplicationCompletionFormId,
    newApplicationRandomCheckFormId,
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
      workflowId: null,
      period: {
        startDate: createCaseHelper.createPeriodStartDate(),
        endDate: 0,
      },
      completions: null,
    },
    currentFormId: newApplicationFormId,
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
    getUserCasesCount,
    getTemplates: getFormTemplates,
    isApprovedForNewApplication,
  });
});
