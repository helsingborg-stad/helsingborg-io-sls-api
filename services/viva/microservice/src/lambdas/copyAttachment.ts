import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import S3 from '../libs/S3';
import { wrappers } from '../libs/lambdaWrapper';

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

export interface S3Record {
  s3: S3;
}

export interface Dependencies {
  copyFile: (sourceKey: string, destinationKey: string) => Promise<void>;
  getLatestUpdatedCase: (personalNumber: string) => Promise<CaseItem>;
}

export interface LambdaRequest {
  Records: S3Record[];
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

function getUniqueKeysByPersonalNumber(
  oldValue: Record<string, string[]>,
  newValue: S3Record
): Record<string, string[]> {
  const [personalNumber, ...rest] = newValue.s3.object.key.split('/');
  const filename = rest.join('/');
  return {
    ...oldValue,
    [personalNumber]: [...new Set([...(oldValue[personalNumber] ?? []), filename])],
  };
}

export async function copyAttachment(input: LambdaRequest, dependencies: Dependencies) {
  const personalNumbersMap = input.Records.reduce(getUniqueKeysByPersonalNumber, {});

  const copyAttachmentPromises = Object.entries(personalNumbersMap)
    .flatMap(async ([personalNumber, files]) => {
      const caseItem = await dependencies.getLatestUpdatedCase(personalNumber);

      const coApplicant = caseItem.persons.find(
        person =>
          person.role === CasePersonRole.CoApplicant && person.personalNumber !== personalNumber
      );

      if (coApplicant) {
        return files.map(fileName =>
          dependencies.copyFile(
            `${personalNumber}/${fileName}`,
            `${coApplicant.personalNumber}/${fileName}`
          )
        );
      }
    })
    .filter(Boolean);

  await Promise.all(copyAttachmentPromises);
  return true;
}

export const main = wrappers.event.wrap(copyAttachment, {
  copyFile,
  getLatestUpdatedCase,
});
