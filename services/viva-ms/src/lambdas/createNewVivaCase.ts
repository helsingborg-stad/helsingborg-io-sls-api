import to from 'await-to-js';
import uuid from 'uuid';
import { GetItemOutput } from 'aws-sdk/clients/dynamodb';

import config from '../libs/config';

import params from '../libs/params';
import log from '../libs/logs';
import { putItem } from '../libs/queries';
import { getStatusByType } from '../libs/caseStatuses';
import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import {
  CASE_PROVIDER_VIVA,
  TWELVE_HOURS,
  VIVA_CASE_CREATED,
  NEW_APPLICATION_VIVA,
} from '../libs/constants';

import createCaseHelper from '../helpers/createCase';
import { CaseUser, CaseItem, CaseStatus, CasePerson, CasePersonRole } from '../types/caseItem';
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

export async function lambda(event: AWSEvent, context: AWSContext, lambdaContext: LambdaContext) {
  const newVivaCaseItem = await createNewVivaCase(event.detail.user);

  const [putError, createdCaseItem] = await to(
    lambdaContext.putItem({
      TableName: config.cases.tableName,
      Item: newVivaCaseItem,
    })
  );
  if (putError) {
    log.error(
      'Failed to create new Viva case',
      context.awsRequestId,
      'service-viva-ms-createNewVivaCase-015',
      putError
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

async function createNewVivaCase(user: CaseUser): Promise<CaseItem> {
  const { newApplicationFormId } = await params.read(config.cases.providers.viva.envsKeyName);

  const formIdList = [newApplicationFormId];
  const initialFormEncryption = createCaseHelper.getFormEncryptionAttributes();
  const initialFormList = createCaseHelper.getInitialFormAttributes(formIdList, initialFormEncryption);

  const id = uuid.v4();
  const PK = `USER#${user.personalNumber}`;
  const SK = `CASE#${id}`;
  const timestampNow = Date.now();
  const expirationTime = millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS));
  const initialStatus: CaseStatus = getStatusByType(NEW_APPLICATION_VIVA);
  const initialCasePerson: CasePerson = getInitCasePerson(user);

  return {
    id,
    PK,
    SK,
    state: VIVA_CASE_CREATED,
    expirationTime,
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    forms: initialFormList,
    provider: CASE_PROVIDER_VIVA,
    persons: [initialCasePerson],
    details: null,
    currentFormId: newApplicationFormId,
  };
}

function getInitCasePerson(user: CaseUser): CasePerson {
  const { personalNumber, firstName, lastName } = user;
  return {
    personalNumber,
    firstName,
    lastName,
    role: CasePersonRole.Applicant,
    hasSigned: false,
  };
}