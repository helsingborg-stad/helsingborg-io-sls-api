import AWS from 'aws-sdk';
import deepEqual from 'deep-equal';

import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import { VivaOfficerType } from '../types/vivaMyPages';
import type { CaseAdministrator } from '../types/caseItem';
import type { VivaOfficer } from '../types/vivaMyPages';
import type { CaseItem } from '../types/caseItem';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  dynamodb: {
    NewImage: Record<string, AWS.DynamoDB.AttributeValue> | undefined;
  };
}

interface LambdaRequest {
  detail: LambdaDetails;
}

const allowedOfficerTypes: string[] = [VivaOfficerType.Officer];

export function createCaseAdministrators(
  vivaOfficer: VivaOfficer | VivaOfficer[]
): CaseAdministrator[] {
  let vivaOfficers: VivaOfficer[] = [];

  if (Array.isArray(vivaOfficer)) {
    vivaOfficers = [...vivaOfficer];
  } else {
    // vivaOfficer is an object when viva applicant has only one officer
    vivaOfficers.push(vivaOfficer);
  }

  const vivaAdministrators = vivaOfficers.map(officer => {
    const { name: complexName, title, mail: email, phone, type } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
      type,
    };
  });

  return vivaAdministrators;
}

function updateCaseAdministrators(keys: CaseKeys, newAdministrators: CaseAdministrator[]) {
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

export interface Dependencies {
  getVivaOfficers: (personalNumber: number) => Promise<VivaOfficer | VivaOfficer[]>;
  updateCase: (keys: CaseKeys, administrators: CaseAdministrator[]) => Promise<void>;
}

export async function syncOfficers(input: LambdaRequest, dependencies: Dependencies) {
  if (!input.detail.dynamodb.NewImage) {
    return true;
  }

  const unMarshalledCaseData = dynamoDb.unmarshall(input.detail.dynamodb.NewImage);
  const { PK, SK, details } = unMarshalledCaseData as CaseItem;
  const caseAdministrators = details?.administrators ?? [];

  const personalNumber = PK.substring(5);
  const vivaOfficers = await dependencies.getVivaOfficers(+personalNumber);

  const administrators = createCaseAdministrators(vivaOfficers);
  const currentAdministrators = administrators.filter(({ type }) =>
    allowedOfficerTypes.includes(type.toLowerCase())
  );

  if (deepEqual(currentAdministrators, caseAdministrators)) {
    return true;
  }

  await dependencies.updateCase({ PK, SK }, currentAdministrators);

  return true;
}

export const main = log.wrap(event => {
  return syncOfficers(event, {
    getVivaOfficers: vivaAdapter.officers.get,
    updateCase: updateCaseAdministrators,
  });
});
