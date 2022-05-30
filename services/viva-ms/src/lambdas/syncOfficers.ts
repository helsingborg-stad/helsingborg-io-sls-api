import AWS from 'aws-sdk';
import deepEqual from 'deep-equal';

import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import officers from '../helpers/officers';

import { CaseAdministrator } from '../types/caseItem';
import { VivaOfficer, VivaOfficerType } from '../types/vivaMyPages';
import { CaseItem } from '../types/caseItem';

type CaseKeys = Pick<CaseItem, 'SK' | 'PK'>;

const allowedOfficerTypes: string[] = [VivaOfficerType.Officer];

async function sendUpdateRequest(keys: CaseKeys, newAdministrators: CaseAdministrator[]) {
  const TableName = config.cases.tableName;

  const dynamoDbParams = {
    TableName,
    Key: keys,
    UpdateExpression: 'SET details.administrators = :newAdministrators',
    ExpressionAttributeValues: { ':newAdministrators': newAdministrators },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', dynamoDbParams);
}

const dynamoDbConverter = AWS.DynamoDB.Converter;

export interface Dependencies {
  getVivaOfficers: (personalNumber: string) => Promise<{ officer: VivaOfficer | VivaOfficer[] }>;
  updateCaseAdministrators: (
    keys: { PK: string; SK: string },
    administrators: CaseAdministrator[]
  ) => Promise<void>;
}

interface LambdaDetails {
  dynamodb: {
    NewImage: Record<string, AWS.DynamoDB.AttributeValue> | undefined;
  };
}

interface LambdaRequest {
  detail: LambdaDetails;
}

export async function syncOfficers(input: LambdaRequest, dependencies: Dependencies) {
  if (input.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  const { getVivaOfficers, updateCaseAdministrators } = dependencies;

  const unMarshalledCaseData = dynamoDbConverter.unmarshall(input.detail.dynamodb.NewImage);

  const { PK, SK, details } = unMarshalledCaseData as CaseItem;
  const administrators = details?.administrators ?? [];

  const personalNumber = PK.substring(5);
  const getOfficersResult = await getVivaOfficers(personalNumber);

  const { officer } = getOfficersResult;
  const parsedVivaOfficers = officers.parseVivaOfficers(officer);
  const filteredVivaOfficers = parsedVivaOfficers.filter(({ type }) =>
    allowedOfficerTypes.includes(type)
  );

  if (deepEqual(parsedVivaOfficers, administrators)) {
    return false;
  }

  await updateCaseAdministrators({ PK, SK }, filteredVivaOfficers);

  return true;
}

export const main = log.wrap(event => {
  return syncOfficers(event, {
    getVivaOfficers: vivaAdapter.officers.get,
    updateCaseAdministrators: sendUpdateRequest,
  });
});
