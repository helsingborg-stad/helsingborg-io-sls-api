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
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  getUserCasesCount: (personalNumber: string) => Promise<GetUserCaseListResponse>;
  getTemplates: typeof getFormTemplates;
  getApprovedNewApplicationUsers: () => Promise<string[]>;
}

async function getApprovedNewApplicationUsers(): Promise<string[]> {
  const { approvedNewApplicationUsers = [] } = await params.read(
    config.vivaNewApplication.envsKeyName
  );

  return approvedNewApplicationUsers;
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

  const approvedNewApplicationUsers = await dependencies.getApprovedNewApplicationUsers();
  if (!approvedNewApplicationUsers.includes(user.personalNumber)) {
    return true;
  }

  const { Count } = await dependencies.getUserCasesCount(user.personalNumber);

  if (Count > 0) {
    return true;
  }

  const { newApplicationFormId, newApplicationCompletionFormId, newApplicationRandomCheckFormId } =
    await dependencies.readParams(config.cases.providers.viva.envsKeyName);

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
        startDate: 0,
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
    readParams: params.read,
    getUserCasesCount,
    getTemplates: getFormTemplates,
    getApprovedNewApplicationUsers,
  });
});
