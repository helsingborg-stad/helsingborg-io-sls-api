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

export async function getUserCases(
  personalNumber: string
): Promise<DynamoDbQueryCasesResult['Items']> {
  const dynamoDbQueryCasesParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumber}`,
      ':sk': `USER#${personalNumber}`,
    },
  };

  const [dynamoDbQueryCasesError, dynamoDbQueryCasesResult] = await to<DynamoDbQueryCasesResult>(
    dynamoDb.call('query', dynamoDbQueryCasesParams)
  );
  if (dynamoDbQueryCasesError) {
    throw new Error(dynamoDbQueryCasesError.message);
  }

  return dynamoDbQueryCasesResult.Items;
}

export function getNewAndChangedValues(currentAnswerList: Answer[], previousAnswerList: Answer[]) {
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
