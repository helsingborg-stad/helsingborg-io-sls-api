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

import { getCaseListOnPeriod, getLastUpdatedCase, getFormTemplates } from '../helpers/dynamoDb';
import createCaseHelper from '../helpers/createCase';
import populateFormWithVivaChildren from '../helpers/populateForm';
import { CaseUser, CaseItem, CaseForm } from '../types/caseItem';
import { VivaMyPages } from '../types/vivaMyPages';

interface DynamoDbQueryOutput {
  Items?: CaseItem[];
  Count?: number;
  ScannedCount?: number;
}

interface AWSEvent {
  detail: {
    clientUser: CaseUser;
    vivaPersonDetail: VivaMyPages;
  };
}

interface AWSContext {
  awsRequestId: string;
}

export async function main(event: AWSEvent, context: AWSContext) {
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

  const [getCaseListOnPeriodError, caseList]: [Error | null, DynamoDbQueryOutput | undefined] =
    await to(getCaseListOnPeriod(vivaPersonDetail));
  if (getCaseListOnPeriodError) {
    log.error(
      'Failed to query cases table',
      context.awsRequestId,
      'service-viva-ms-createVivaCase-003',
      getCaseListOnPeriodError
    );
    return false;
  }

  if (caseList?.Items && caseList.Items[0]) {
    log.info('Case with specified period already exists', context.awsRequestId, null);
    return true;
  }

  const [createRecurringVivaCaseError, createdVivaCase]: [Error | null, DynamoDbQueryOutput] =
    await to(createRecurringCase(vivaPersonDetail, clientUser));
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

async function createRecurringCase(vivaPerson: VivaMyPages, user: CaseUser) {
  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    throw paramsReadError;
  }

  const { recurringFormId, completionFormId, randomCheckFormId } = vivaCaseSSMParams;

  const applicantPersonalNumber = createCaseHelper.stripNonNumericalCharacters(
    vivaPerson.case.client.pnumber
  );

  const id = uuid.v4();
  const PK = `USER#${applicantPersonalNumber}`;
  const timestampNow = Date.now();
  const initialStatus = getStatusByType(NOT_STARTED_VIVA);
  const workflowId = vivaPerson.application?.workflowid ?? null;
  const casePersonList = createCaseHelper.getCasePersonList(vivaPerson.case);

  const newCaseItem: CaseItem = {
    id,
    PK,
    SK: `CASE#${id}`,
    state: VIVA_CASE_CREATED,
    expirationTime: millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS)),
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    provider: CASE_PROVIDER_VIVA,
    persons: casePersonList,
    details: {
      workflowId,
      period: createCaseHelper.getPeriodInMilliseconds(vivaPerson.application),
    },
    currentFormId: recurringFormId,
  };

  const casePersonCoApplicant = createCaseHelper.getUserOnRole(casePersonList, 'coApplicant');
  if (casePersonCoApplicant) {
    newCaseItem.GSI1 = `USER#${casePersonCoApplicant.personalNumber}`;
  }

  const formIdList = [recurringFormId, completionFormId, randomCheckFormId];
  const initialFormList = createCaseHelper.getInitialFormAttributes(formIdList, vivaPerson);

  const extendedCasePersonList = casePersonList.map(person => {
    if (person.role === 'applicant' && person.personalNumber === user.personalNumber) {
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

  const [putItemError, createdCaseItem] = await to(
    putItem({
      TableName: config.cases.tableName,
      Item: newCaseItem,
    })
  );
  if (putItemError) {
    throw putItemError;
  }

  return createdCaseItem;
}
