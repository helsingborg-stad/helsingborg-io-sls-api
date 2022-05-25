import AWS from 'aws-sdk';
import deepEqual from 'deep-equal';

import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import { VivaOfficer } from '../types/vivaMyPages';

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

function parseVivaOfficers(vivaOfficer: VivaOfficer | VivaOfficer[]): ParsedVivaOfficer[] {
  let vivaOfficers: VivaOfficer[] = [];

  if (Array.isArray(vivaOfficer)) {
    vivaOfficers = [...vivaOfficer];
  } else {
    // vivaOfficer is an object when viva applicant has only one officer
    vivaOfficers.push(vivaOfficer);
  }

  const vivaAdministrators = vivaOfficers.map(officer => {
    const { name: complexName, title, mail: email, phone } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
    };
  });

  return vivaAdministrators;
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
  const vivaAdministrators = parseVivaOfficers(officer);

  if (deepEqual(vivaAdministrators, administrators)) {
    return false;
  }

  await updateCaseOfficers({ PK, SK }, vivaAdministrators);

  return true;
}
