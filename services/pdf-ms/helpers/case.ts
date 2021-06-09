/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { Case, Answer } from './types';

interface DynamoDbQueryCasesResult {
  Count: number;
  Items: Case[];
  ScannedCount: number;
}

export async function getClosedUserCases(
  personalNumber: string
): Promise<DynamoDbQueryCasesResult['Items']> {
  const dynamoDbQueryCasesParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':sk': 'CASE#',
      ':statusTypeClosed': 'closed',
    },
  };

  const [dynamoDbQueryCasesError, dynamoDbQueryCasesResult] = await to<DynamoDbQueryCasesResult>(
    dynamoDb.call('query', dynamoDbQueryCasesParams)
  );
  if (dynamoDbQueryCasesError) {
    throw dynamoDbQueryCasesError;
  }

  return dynamoDbQueryCasesResult.Items;
}

export async function addPdfToCase(currentCase: Case, pdf?: string | Buffer): Promise<Boolean> {
  const UpdateExpression = 'SET #pdf = :pdf, #pdfGenerated = :pdfGenerated';
  const ExpressionAttributeNames = { '#pdf': 'pdf', '#pdfGenerated': 'pdfGenerated' };
  const ExpressionAttributeValues = {
    ':pdf': pdf || undefined,
    ':pdfGenerated': pdf !== undefined ? 'yes' : 'no',
  };

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: currentCase.PK,
      SK: currentCase.SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValue: 'NONE',
  };

  const [dynamoDbUpdateCaseError] = await to(dynamoDb.call('update', params));
  if (dynamoDbUpdateCaseError) {
    throw dynamoDbUpdateCaseError;
  }

  return true;
}

export function getLatestCase(cases: Case[]): Case {
  const casesSortedByUpdatedAt = cases.sort(
    (caseA: Case, caseB: Case) => caseB.updatedAt - caseA.updatedAt
  );

  return casesSortedByUpdatedAt.shift();
}

export function getNewAndChangedCaseAnswerValues(
  currentAnswerList: Answer[],
  previousAnswerList: Answer[]
): Record<string, any> {
  const changedValues: string[] = [];
  const newValues: string[] = [];

  return currentAnswerList.reduce(
    (acc, currentAnswer) => {
      const updatedAcc = { ...acc };

      const previousAnswer = previousAnswerList.find(
        answer => answer.field.id === currentAnswer.field.id
      );

      if (previousAnswer && previousAnswer.value !== currentAnswer.value) {
        updatedAcc.changedValues.push(previousAnswer.field.id);
      }

      if (!previousAnswer) {
        updatedAcc.newValues.push(currentAnswer.field.id);
      }

      return updatedAcc;
    },
    { changedValues, newValues }
  );
}
