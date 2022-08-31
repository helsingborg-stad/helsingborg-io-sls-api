import to from 'await-to-js';
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
import { CaseUser, CaseItem, CaseForm, CasePersonRole, CasePeriod } from '../types/caseItem';
import { VivaParametersResponse } from '../types/ssmParameters';
import { VivaMyPages } from '../types/vivaMyPages';

interface DynamoDbQueryOutput {
  Items?: CaseItem[];
  Count?: number;
  ScannedCount?: number;
}

interface LambdaDetails {
  clientUser: CaseUser;
  vivaPersonDetail: VivaMyPages;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  createCase: typeof putItem;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  getCaseByPeriod: (personalNumber: string) => Promise<GetUserCaseListResponse>;
  getTemplates: typeof getFormTemplates;
}

export async function createRecurringCase(vivaPerson: VivaMyPages, user: CaseUser) {
  const { clientUser, vivaPersonDetail } = event.detail;

  const casePeriod: CasePeriod = createCaseHelper.getPeriodInMilliseconds(
    vivaPersonDetail.application
  );

  const caseList: DynamoDbQueryOutput = await getCaseListByPeriod(
    clientUser.personalNumber,
    casePeriod
  );
  if (caseList?.Items?.[0]) {
    log.writeInfo('Case with specified period already exists', context.awsRequestId);
    return true;
  }

  const vivaCaseSSMParams = await params.read(config.cases.providers.viva.envsKeyName);
  const { recurringFormId, completionFormId, randomCheckFormId } = vivaCaseSSMParams;

  const applicantPersonalNumber = createCaseHelper.stripNonNumericalCharacters(
    vivaPerson.case.client.pnumber
  );

  const id = uuid.v4();
  const PK = `USER#${applicantPersonalNumber}`;
  const SK = `CASE#${id}`;
  const timestampNow = Date.now();
  const initialStatus = getStatusByType(NOT_STARTED_VIVA);
  const workflowId = vivaPerson.application?.workflowid ?? null;
  const casePersonList = createCaseHelper.getCasePersonList(vivaPerson.case);

  const newCaseItem: CaseItem = {
    id,
    PK,
    SK,
    state: VIVA_CASE_CREATED,
    expirationTime: millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS)),
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    forms: {},
    provider: CASE_PROVIDER_VIVA,
    persons: casePersonList,
    details: {
      workflowId,
      period: createCaseHelper.getPeriodInMilliseconds(vivaPerson.application),
      completions: null,
    },
    currentFormId: recurringFormId,
  };

  const casePersonCoApplicant = createCaseHelper.getUserByRole(
    casePersonList,
    CasePersonRole.CoApplicant
  );
  if (casePersonCoApplicant) {
    newCaseItem.GSI1 = `USER#${casePersonCoApplicant.personalNumber}`;
  }

  const formIdList = [recurringFormId, completionFormId, randomCheckFormId];
  const isCoApplicant = casePersonCoApplicant !== undefined;
  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes(isCoApplicant);
  const initialFormList = createCaseHelper.getInitialFormAttributes(
    formIdList,
    initialFormEncryption
  );

  const extendedCasePersonList = casePersonList.map(person => {
    if (person.role === CasePersonRole.Applicant && person.personalNumber === user.personalNumber) {
      return { ...user, ...person };
    }
    return person;
  });

  const [, formTemplates] = await to(getFormTemplates(formIdList));

  const [getLastUpdatedCaseError, lastUpdatedCase]: [Error | null, CaseItem] = await to(
    getLastUpdatedCase(PK)
  );
  if (getLastUpdatedCaseError) {
    throw getLastUpdatedCaseError;
  }

  const prePopulatedForms: Record<string, CaseForm> = populateFormWithPreviousCaseAnswers(
    initialFormList,
    extendedCasePersonList,
    formTemplates,
    lastUpdatedCase?.forms ?? {}
  );

  const vivaChildrenList = createCaseHelper.getVivaChildren(casePersonList);
  if (vivaChildrenList.length > 0) {
    const recurringFormPrePopulated = prePopulatedForms[recurringFormId];
    prePopulatedForms[recurringFormId] = populateFormWithVivaChildren(
      recurringFormPrePopulated,
      formTemplates[recurringFormId],
      vivaChildrenList
    );
  }

  newCaseItem.forms = prePopulatedForms;

  const createdCaseItem = putItem({
    TableName: config.cases.tableName,
    Item: newCaseItem,
  });

  log.writeInfo('Viva case created successfully', createdCaseItem);
  return true;
}

export const main = log.wrap(event => {
  return createRecurringCase(event, {
    createCase: putItem,
    readParams: params.read,
    getUserCasesCount,
    getTemplates: getFormTemplates,
  });
});
