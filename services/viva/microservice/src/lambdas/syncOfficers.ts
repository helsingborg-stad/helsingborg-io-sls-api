import deepEqual from 'deep-equal';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import createAdministrators from '../helpers/createAdministrators';
import { cases } from '../helpers/query';
import { VivaOfficerType } from '../types/vivaMyPages';
import type { CaseAdministrator } from '../types/caseItem';
import type { VivaOfficer } from '../types/vivaMyPages';
import type { CaseItem } from '../types/caseItem';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  keys: CaseKeys;
}

interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  getOfficers: (personalNumber: string) => Promise<VivaOfficer | VivaOfficer[]>;
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  updateCase: (keys: CaseKeys, administrators: CaseAdministrator[]) => Promise<void>;
}

const allowedOfficerTypes = [VivaOfficerType.Officer.toString()];

function updateCaseAdministrators(
  keys: CaseKeys,
  newAdministrators: CaseAdministrator[]
): Promise<void> {
  const TableName = config.cases.tableName;

  const updateParams = {
    TableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.administrators = :newAdministrators',
    ExpressionAttributeValues: { ':newAdministrators': newAdministrators },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function syncOfficers(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  if (!input.detail.keys) {
    return true;
  }

  const caseItem = await dependencies.getCase(input.detail.keys);
  const { PK, SK, details } = caseItem;

  const personalNumber = PK.substring(5);
  const vivaOfficers = await dependencies.getOfficers(personalNumber);

  const administrators = createAdministrators(vivaOfficers);
  const currentAdministrators = administrators.filter(({ type }) =>
    allowedOfficerTypes.includes(type.toLowerCase())
  );

  const caseAdministrators = details?.administrators ?? [];
  if (deepEqual(currentAdministrators, caseAdministrators)) {
    return true;
  }

  await dependencies.updateCase({ PK, SK }, currentAdministrators);

  return true;
}

export const main = log.wrap(event =>
  syncOfficers(event, {
    getOfficers: vivaAdapter.officers.get,
    getCase: cases.get,
    updateCase: updateCaseAdministrators,
  })
);
