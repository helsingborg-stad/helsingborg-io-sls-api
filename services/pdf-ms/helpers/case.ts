/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { Case } from './types';

interface DynamoDbQueryCasesResult {
  Count: number;
  Items: Case[];
  ScannedCount: number;
}

export async function getUserCases(personalNumber: string) {
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
    return console.error(dynamoDbQueryCasesError);
  }

  return dynamoDbQueryCasesResult.Items;
}

// TODO: change to answers instead of case in args
export function getNewAndChangedValues(currentCase: Case, oldCase: Case) {
  const changedValues: string[] = [];
  const newValues: string[] = [];

  currentCase.forms[currentCase.currentFormId].answers.forEach(answer => {
    const oldValue = oldCase.forms[currentCase.currentFormId].answers.find(
      oldAnswer => answer.field.id === oldAnswer.field.id
    );

    if (oldValue && oldValue.value !== answer.value) {
      changedValues.push(oldValue.field.id);
    } else if (!oldValue) {
      newValues.push(answer.field.id);
    }
  });

  return { changedValues, newValues };
}
