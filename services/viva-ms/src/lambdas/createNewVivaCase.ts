import to from 'await-to-js';
import uuid from 'uuid';
import { GetItemOutput, QueryOutput } from 'aws-sdk/clients/dynamodb';

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

import { getFormTemplates } from '../helpers/dynamoDb';
import createCaseHelper from '../helpers/createCase';
import {
  CaseUser,
  CaseItem,
  CaseForm,
  CaseStatus,
  CasePersonRole,
  CasePerson,
} from '../types/caseItem';
import { VivaApplicationStatus } from '../types/vivaMyPages';

export interface AWSEvent {
  detail: {
    user: CaseUser;
    status: VivaApplicationStatus[];
  };
}

interface AWSContext {
  awsRequestId: string;
}

interface DynamoDbPutParam {
  TableName: string;
  Item: CaseItem;
}

export interface LambdaContext {
  putItem({ TableName, Item }: DynamoDbPutParam): Promise<GetItemOutput>;
}

export function main(event: AWSEvent, context: AWSContext) {
  return lambda(event, context, { putItem });
}

export async function lambda(
  event: AWSEvent,
  context: AWSContext,
  lambdaContext: LambdaContext
): Promise<boolean> {
  const { user } = event.detail;
  const { newApplicationFormId } = await params.read(config.cases.providers.viva.envsKeyName);

  const [, queryResponse] = await to(getUserCaseList(user.personalNumber));
  if (queryResponse?.Count) {
    return true;
  }

  const formIdList = [newApplicationFormId];
  const isCoApplicant = false;
  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes(isCoApplicant);
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

  const newVivaCaseItem: CaseItem = {
    id,
    PK,
    SK,
    state: VIVA_CASE_CREATED,
    expirationTime,
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    forms: null,
    provider: CASE_PROVIDER_VIVA,
    persons: initialPersonList,
    details: null,
    currentFormId: newApplicationFormId,
  };

  const extendedCasePersonList = initialPersonList.map(person => {
    if (person.role === CasePersonRole.Applicant && person.personalNumber === user.personalNumber) {
      return { ...user, ...person };
    }
    return person;
  });

  const [, formTemplates] = await to(getFormTemplates(formIdList));

  const prePopulatedForms: Record<string, CaseForm> = populateFormWithPreviousCaseAnswers(
    initialFormList,
    extendedCasePersonList,
    formTemplates,
    {}
  );

  newVivaCaseItem.forms = prePopulatedForms;

  const [putItemError, createdCaseItem] = await to(
    lambdaContext.putItem({
      TableName: config.cases.tableName,
      Item: newVivaCaseItem,
    })
  );
  if (putItemError) {
    log.error(
      'Failed to create new Viva case',
      context.awsRequestId,
      'service-viva-ms-createNewVivaCase-015',
      putItemError
    );
    return false;
  }

  log.info(
    'New Viva case created successfully',
    context.awsRequestId,
    'service-viva-ms-createNewVivaCase-020',
    createdCaseItem
  );

  return true;
}

function getUserCaseList(personalNumber: string): Promise<QueryOutput> {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
    },
  };

  return dynamoDb.call('query', queryParams);
}
