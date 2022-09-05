import uuid from 'uuid';

import config from '../libs/config';

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

import { getCaseListByPeriod, getLastUpdatedCase, getFormTemplates } from '../helpers/dynamoDb';
import createCaseHelper from '../helpers/createCase';
import populateFormWithVivaChildren from '../helpers/populateForm';

import { CasePersonRole } from '../types/caseItem';
import type { CaseUser, CaseItem, CaseForm, CasePeriod, CaseStatus } from '../types/caseItem';
import type { VivaParametersResponse } from '../types/ssmParameters';
import type { VivaMyPages } from '../types/vivaMyPages';

interface DynamoDbQueryOutput {
  Items: CaseItem[];
  Count: number;
  ScannedCount: number;
}
export interface DynamoDbPutParams {
  TableName: string;
  Item: CaseItem;
}

interface LambdaDetails {
  clientUser: CaseUser;
  vivaPersonDetail: VivaMyPages;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  createCase: (params: DynamoDbPutParams) => Promise<void>;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  getLastUpdatedCase: (pk: string) => Promise<CaseItem | undefined>;
  getCaseListByPeriod: (personalNumber: string, period: CasePeriod) => Promise<DynamoDbQueryOutput>;
  getFormTemplates: (formIdList: string[]) => Promise<Record<string, unknown>>;
}

export async function createVivaCase(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { clientUser: user, vivaPersonDetail: vivaMyPages } = input.detail;

  const period = createCaseHelper.getPeriodInMilliseconds(vivaMyPages.application.period);
  const caseList = await dependencies.getCaseListByPeriod(user.personalNumber, period);
  if (caseList?.Count > 0) {
    log.writeInfo('Case with specified period already exists. Case id:', caseList.Items[0]?.id);
    return true;
  }

  const { recurringFormId, completionFormId, randomCheckFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );

  const applicantPersonalNumber = createCaseHelper.stripNonNumericalCharacters(
    vivaMyPages.case.client.pnumber
  );

  const id = uuid.v4();
  const PK = `USER#${applicantPersonalNumber}`;
  const SK = `CASE#${id}`;
  const timestampNow = Date.now();
  const initialStatus: CaseStatus = getStatusByType(NOT_STARTED_VIVA);
  const workflowId = vivaMyPages.application?.workflowid ?? null;
  const casePersonList = createCaseHelper.getCasePersonList(vivaMyPages.case);
  const expirationTime = millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS));

  const newRecurringCase: CaseItem = {
    id,
    PK,
    SK,
    state: VIVA_CASE_CREATED,
    expirationTime,
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    forms: {},
    provider: CASE_PROVIDER_VIVA,
    persons: casePersonList,
    details: {
      workflowId,
      period,
      completions: null,
    },
    currentFormId: recurringFormId,
  };

  const coApplicant = createCaseHelper.getUserByRole(casePersonList, CasePersonRole.CoApplicant);
  if (coApplicant) {
    newRecurringCase.GSI1 = `USER#${coApplicant.personalNumber}`;
  }

  const formIdList = [recurringFormId, completionFormId, randomCheckFormId];
  const isCoApplicant = coApplicant != undefined;
  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes(isCoApplicant);
  const initialFormList = createCaseHelper.getInitialFormAttributes(
    formIdList,
    initialFormEncryption
  );

  const extendedPersonList = casePersonList.map(person => {
    if (person.role === CasePersonRole.Applicant && person.personalNumber === user.personalNumber) {
      return { ...user, ...person };
    }
    return person;
  });

  const formTemplates = await dependencies.getFormTemplates(formIdList);
  const lastUpdatedCase = await dependencies.getLastUpdatedCase(PK);

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialFormList,
    extendedPersonList,
    formTemplates,
    lastUpdatedCase?.forms
  ) as Record<string, CaseForm>;

  const vivaChildrenList = createCaseHelper.getVivaChildren(casePersonList);
  if (vivaChildrenList.length > 0) {
    const recurringFormPrePopulated = prePopulatedForms[recurringFormId];
    prePopulatedForms[recurringFormId] = populateFormWithVivaChildren(
      recurringFormPrePopulated,
      formTemplates[recurringFormId],
      vivaChildrenList
    ) as CaseForm;
  }

  newRecurringCase.forms = prePopulatedForms;

  await dependencies.createCase({
    TableName: config.cases.tableName,
    Item: newRecurringCase,
  });

  log.writeInfo('Viva recurring case created successfully.', newRecurringCase.id);
  return true;
}

export const main = log.wrap(event => {
  return createVivaCase(event, {
    createCase: putItem,
    readParams: params.read,
    getLastUpdatedCase,
    getCaseListByPeriod,
    getFormTemplates,
  });
});
