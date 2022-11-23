import { objectWithoutProperties } from '../libs/objects';
import { putEvent } from '../libs/awsEventBridge';
import { wrappers } from '../libs/lambdaWrapper';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';

export type Case = Record<string, unknown>;

export interface FunctionResponse {
  attributes: { cases: Case[] };
}

export interface Dependencies {
  putSuccessEvent: (personalNumber: string) => void;
  getCases: (personalNumber: string) => Promise<Case[]>;
}

interface FunctionInput {
  personalNumber: string;
}

function putSuccessEvent(personalNumber: string): void {
  putEvent({ personalNumber }, 'casesApiInvokeSuccess', 'casesApi.getCaseList');
}

function getUserCoApplicantCaseList(personalNumber: string): Promise<{ Items: Case[] }> {
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

function getUserApplicantCaseList(personalNumber: string): Promise<{ Items: Case[] }> {
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

async function getUserCaseList(personalNumber: string): Promise<Case[]> {
  const applicantCaseListResult = (await getUserApplicantCaseList(personalNumber)).Items;
  const coApplicantCaseListResult = (await getUserCoApplicantCaseList(personalNumber)).Items;

  return [...new Set([...applicantCaseListResult, ...coApplicantCaseListResult])];
}

export async function getCaseList(
  input: FunctionInput,
  dependencies: Dependencies
): Promise<FunctionResponse> {
  dependencies.putSuccessEvent(input.personalNumber);

  const cases = await dependencies.getCases(input.personalNumber);
  const casesWithoutProperties = cases.map(item =>
    objectWithoutProperties(item, ['PK', 'SK', 'GSI1', 'PDF'])
  );

  return {
    attributes: {
      cases: casesWithoutProperties,
    },
  };
}

export const main = wrappers.restJSON.wrap(getCaseList, {
  putSuccessEvent,
  getCases: getUserCaseList,
});
