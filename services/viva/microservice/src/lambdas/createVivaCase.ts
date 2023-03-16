import S3 from '../libs/S3';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import { putItem } from '../libs/queries';
import { populateFormWithPreviousCaseAnswers } from '../libs/formAnswers';

import createCaseHelper from '../helpers/createCase';
import populateFormWithVivaChildren from '../helpers/populateForm';
import { getCaseListByPeriod, getLastUpdatedCase, getFormTemplates } from '../helpers/dynamoDb';

import { CasePersonRole } from '../types/caseItem';
import { getConfigFromS3 } from '../helpers/vivaPeriod';
import { getCurrentPeriodInfo } from '../helpers/vivaPeriod';
import EkbCaseFactory from '../helpers/case/EkbCaseFactory';
import S3CaseContactsFactory from '../helpers/caseContacts/S3CaseContactsFactory';

import type { CaseUser, CaseItem, CaseForm, CasePerson } from '../types/caseItem';
import type { VivaMyPagesVivaCase, VivaMyPagesVivaApplication } from '../types/vivaMyPages';
import type { PeriodConfig } from '../helpers/vivaPeriod';
import type { VivaParametersResponse } from '../types/ssmParameters';
import type { ICaseFactory } from '../helpers/case/CaseFactory';
import type { ICaseContactsFactory } from '../helpers/caseContacts/CaseContactsFactory';

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
  myPages: VivaMyPagesVivaCase;
  application: VivaMyPagesVivaApplication;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  createCase: (params: DynamoDbPutParams) => Promise<void>;
  createInitialForms: () => Promise<Record<string, CaseForm>>;
  getCaseListByPeriod: (
    personalNumber: string,
    application: VivaMyPagesVivaApplication
  ) => Promise<DynamoDbQueryOutput>;
  getFormTemplates: (formIds: string[]) => Promise<Record<string, unknown>>;
  getLastUpdatedCase: (pk: string) => Promise<CaseItem | undefined>;
  getPeriodConfig(): Promise<PeriodConfig>;
  getRecurringFormId: () => Promise<string>;
  caseFactory: ICaseFactory<unknown>;
  contactsFactory: ICaseContactsFactory;
}

async function createInitialForms(): Promise<Record<string, CaseForm>> {
  const { recurringFormId, completionFormId, randomCheckFormId }: VivaParametersResponse =
    await params.read(config.cases.providers.viva.envsKeyName);

  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes();
  const initialForms = createCaseHelper.getInitialFormAttributes(
    [recurringFormId, completionFormId, randomCheckFormId],
    initialFormEncryption
  );

  return initialForms;
}

async function getRecurringFormId(): Promise<string> {
  const { recurringFormId } = await params.read(config.cases.providers.viva.envsKeyName);
  return recurringFormId as string;
}

function setCaseCoApplicant(newRecurringCase: CaseItem): void {
  const coApplicant = createCaseHelper.getUserByRole(
    newRecurringCase.persons,
    CasePersonRole.CoApplicant
  );
  if (coApplicant) {
    newRecurringCase.GSI1 = `USER#${coApplicant.personalNumber}`;
  }
}

export async function createVivaCase(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { clientUser: user, myPages, application } = input.detail;

  const caseList: DynamoDbQueryOutput = await dependencies.getCaseListByPeriod(
    user.personalNumber,
    application
  );
  if (caseList.Count > 0) {
    return true;
  }

  const periodConfig = await dependencies.getPeriodConfig();
  const { isPeriodOpen } = getCurrentPeriodInfo(periodConfig);

  if (!isPeriodOpen) {
    return true;
  }

  const newRecurringCase = await dependencies.caseFactory.createCase({
    vivaMyPages: myPages,
    vivaPeriod: application.period,
    workflowId: application?.workflowid ?? null,
  });

  setCaseCoApplicant(newRecurringCase);

  const initialForms = await dependencies.createInitialForms();
  const initialFormsKeys = Object.keys(initialForms);

  const formTemplates = await dependencies.getFormTemplates(initialFormsKeys);
  const latestClosedCase = await dependencies.getLastUpdatedCase(newRecurringCase.PK);

  const extendedPersonList = newRecurringCase.persons.map(person => {
    const isApplicant = person.role === CasePersonRole.Applicant;
    const isNavetUser = user.personalNumber === person.personalNumber;

    if (isApplicant && isNavetUser) {
      return { ...user, ...person };
    }

    return person;
  });

  const prePopulatedForms = populateFormWithPreviousCaseAnswers({
    forms: initialForms,
    applicants: extendedPersonList,
    formTemplates,
    previousForms: latestClosedCase?.forms,
  }) as Record<string, CaseForm>;

  const recurringFormId = await dependencies.getRecurringFormId();

  const vivaChildrenList: CasePerson[] = createCaseHelper.getVivaChildren(newRecurringCase.persons);
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

  return true;
}

export const main = log.wrap(event => {
  const contactsFactory = new S3CaseContactsFactory({
    bucketName: process.env.EKB_CONFIG_BUCKET_NAME ?? '',
    contactsFileKey: 'contacts.json',
    getFromS3: (bucket, key) => S3.getFile(bucket, key).then(s3 => s3.Body),
  });

  const caseFactory = new EkbCaseFactory({
    getRecurringFormId: getRecurringFormId,
    getContacts: () => contactsFactory.getContacts(),
  });

  return createVivaCase(event, {
    createCase: putItem,
    getRecurringFormId,
    getLastUpdatedCase,
    getCaseListByPeriod,
    getFormTemplates,
    createInitialForms,
    getPeriodConfig: getConfigFromS3,

    caseFactory,
    contactsFactory,
  });
});
