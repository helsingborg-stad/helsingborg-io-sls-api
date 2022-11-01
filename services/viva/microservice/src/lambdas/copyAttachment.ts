import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';
import S3 from '../libs/S3';

import { CasePersonRole } from '../types/caseItem';
import type { CaseItem } from '../types/caseItem';

interface GetCasesResponse {
  Items: CaseItem[];
}

interface S3Object {
  key: string;
}

interface S3 {
  object: S3Object;
}

export interface Record {
  s3: S3;
}

export interface Dependencies {
  copyFile: (sourceKey: string, destinationKey: string) => Promise<void>;
  getLatestUpdatedCase: (personalNumber: string) => Promise<CaseItem>;
}

export interface LambdaRequest {
  Records: Record[];
}

function copyFile(sourceKey: string, targetKey: string): Promise<void> {
  const BUCKET_NAME = process.env.BUCKET_NAME ?? '';

  return S3.copyFileWithinBucket(BUCKET_NAME, sourceKey, targetKey);
}

async function getLatestUpdatedCase(personalNumber: string): Promise<CaseItem> {
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
  const latestCase = (result.Items ?? []).sort((a, b) => a.updatedAt - b.updatedAt);

  return latestCase[0] ?? ({} as CaseItem);
}

export async function copyAttachment(input: LambdaRequest, dependencies: Dependencies) {
  const [personalNumber, filename] = input.Records[0].s3.object.key.split('/');
  const caseItem = await dependencies.getLatestUpdatedCase(personalNumber);

  const coApplicant = caseItem.persons.find(
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

export const main = log.wrap(event => {
  return copyAttachment(event, {
    copyFile,
    getLatestUpdatedCase,
  });
});
