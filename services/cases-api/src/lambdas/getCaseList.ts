import { objectWithoutProperties } from '../libs/objects';
import { putEvent } from '../libs/awsEventBridge';
import { wrappers } from '../libs/lambdaWrapper';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';

import type { CaseItem } from '../types/case';

interface SuccessEvent {
  user: Input;
}

export type CaseWithOmittedProperties = Omit<CaseItem, 'PK' | 'SK' | 'GSI1'>;

export interface FunctionResponse {
  attributes: { cases: CaseWithOmittedProperties[] };
}

interface Input {
  personalNumber: string;
}

export interface Dependencies {
  getCases: (personalNumber: string) => Promise<CaseItem[]>;
  triggerEvent: (personalNumber: string) => void;
}

function triggerEvent(personalNumber: string): void {
  const params: SuccessEvent = {
    user: {
      personalNumber,
    },
  };
  putEvent(params, 'casesApiInvokeSuccess', 'casesApi.getCaseList');
}

function getUserCoApplicantCaseList(personalNumber: string): Promise<{ Items: CaseItem[] }> {
  const GSI1 = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1 AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', queryParams);
}

function getUserApplicantCaseList(personalNumber: string): Promise<{ Items: CaseItem[] }> {
  const PK = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', queryParams);
}

async function getUserCaseList(personalNumber: string): Promise<CaseItem[]> {
  const cases = await Promise.all([
    (await getUserApplicantCaseList(personalNumber)).Items,
    (await getUserCoApplicantCaseList(personalNumber)).Items,
  ]);

  return [...new Set(cases.flat())];
}

export async function getCaseList(
  input: Input,
  dependencies: Dependencies
): Promise<FunctionResponse> {
  const { personalNumber } = input;
  dependencies.triggerEvent(personalNumber);

  const cases = await dependencies.getCases(input.personalNumber);
  const casesWithoutProperties = cases.map(item =>
    objectWithoutProperties(item, ['PK', 'SK', 'GSI1'])
  );

  return {
    attributes: {
      cases: casesWithoutProperties as unknown as CaseWithOmittedProperties[],
    },
  };
}

export const main = wrappers.restJSON.wrap(getCaseList, {
  triggerEvent,
  getCases: getUserCaseList,
});
