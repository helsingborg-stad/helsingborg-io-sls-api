import AWS from 'aws-sdk';
import deepEqual from 'deep-equal';

import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import officers from '../helpers/officers';

import { VivaOfficer } from '../types/vivaMyPages';

const allowedOfficerTitles = ['socialsekreterare'];

async function sendUpdateRequest(keys, newAdministrators) {
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

interface ParsedVivaOfficer {
  name: string;
  title: string;
  email: string;
  phone: string | null;
}

export interface Dependencies {
  getOfficers: (personalNumber: string) => Promise<{ officer: VivaOfficer | VivaOfficer[] }>;
  updateCaseOfficers: (
    keys: { PK: string; SK: string },
    administrators: ParsedVivaOfficer[]
  ) => Promise<void>;
}

interface LambdaDetails {
  dynamodb: {
    NewImage: Record<string, AWS.DynamoDB.AttributeValue>;
  };
}

interface LambdaRequest {
  detail: LambdaDetails;
}

export const main = log.wrap(event => {
  return syncOfficers(event, {
    getOfficers: vivaAdapter.officers.get,
    updateCaseOfficers: sendUpdateRequest,
  });
});

export async function syncOfficers(input: LambdaRequest, dependencies: Dependencies) {
  if (input.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  const { getOfficers, updateCaseOfficers } = dependencies;

  const unMarshalledCaseData = dynamoDbConverter.unmarshall(input.detail.dynamodb.NewImage);

  const { PK, SK, details = {} } = unMarshalledCaseData;
  const { administrators = [] } = details;

  const personalNumber = PK.substring(5);
  const getOfficersResult = await getOfficers(personalNumber);

  const { officer } = getOfficersResult;
  const parsedVivaOfficers = officers.parseVivaOfficers(officer);
  const filteredVivaOfficers = parsedVivaOfficers.filter(officer =>
    officers.filterVivaOfficerByTitle(officer, allowedOfficerTitles)
  );

  if (deepEqual(filteredVivaOfficers, administrators)) {
    return false;
  }

  await updateCaseOfficers({ PK, SK }, filteredVivaOfficers);

  return true;
}
