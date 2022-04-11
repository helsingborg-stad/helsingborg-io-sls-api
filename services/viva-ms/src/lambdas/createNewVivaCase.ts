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

import { CaseUser, CaseItem, CaseStatus } from '../types/caseItem';
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

async function createNewVivaCase(user: CaseUser) {
  const { newApplicationFormId } = await params.read(config.cases.providers.viva.envsKeyName);

  const id = uuid.v4();
  const PK = `USER#${user.personalNumber}`;
  const timestampNow = Date.now();
  const initialStatus: CaseStatus = getStatusByType(NEW_APPLICATION_VIVA);

  const caseItem: CaseItem = {
    id,
    PK,
    SK: `CASE#${id}`,
    state: VIVA_CASE_CREATED,
    expirationTime: millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS)),
    createdAt: timestampNow,
    updatedAt: 0,
    status: initialStatus,
    provider: CASE_PROVIDER_VIVA,
    persons: [],
    details: null,
    currentFormId: newApplicationFormId,
  };

  return caseItem;
}
