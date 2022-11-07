import { wrappers } from '../libs/lambdaWrapper';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import S3 from '../libs/S3';

import { CasePersonRole } from '../types/caseItem';
import type { CaseItem } from '../types/caseItem';

interface GetCasesResponse {
  Items: CaseItem[];
}

interface S3EventObject {
  key: string;
}

export interface EventDetail {
  object: S3EventObject;
}

export interface Dependencies {
  copyFile: (sourceKey: string, destinationKey: string) => Promise<void>;
  getLatestUpdatedCase: (personalNumber: string) => Promise<CaseItem | undefined>;
}

export interface FunctionInput {
  detail: EventDetail;
}

type FunctionResponse = Promise<boolean>;

function copyFile(sourceKey: string, targetKey: string): Promise<void> {
  const { BUCKET_NAME = '' } = process.env;

  return S3.copyFileWithinBucket(BUCKET_NAME, sourceKey, targetKey);
}

async function getLatestUpdatedCase(personalNumber: string): Promise<CaseItem | undefined> {
  const PK = `USER#${personalNumber}`;

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': PK,
    },
    ProjectionExpression: 'persons, updatedAt',
  };

  const result = (await dynamoDb.call('query', queryParams)) as GetCasesResponse;
  const [latestCase] = (result.Items ?? []).sort((a, b) => a.updatedAt - b.updatedAt);

  return latestCase;
}

export async function copyAttachment(
  input: FunctionInput,
  dependencies: Dependencies
): FunctionResponse {
  const [personalNumber, filename] = input.detail.object.key.split('/');
  const caseItem = await dependencies.getLatestUpdatedCase(personalNumber);

  const coApplicant = caseItem?.persons.find(
    applicant =>
      applicant.role === CasePersonRole.CoApplicant && applicant.personalNumber !== personalNumber
  );

  if (!coApplicant) {
    return false;
  }

  await dependencies.copyFile(
    `${personalNumber}/${filename}`,
    `${coApplicant.personalNumber}/${filename}`
  );

  return true;
}

export const main = wrappers.event.wrap(copyAttachment, {
  copyFile,
  getLatestUpdatedCase,
});
