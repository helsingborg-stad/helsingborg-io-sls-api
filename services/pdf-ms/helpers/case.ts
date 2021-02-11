/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { Case, Answer, Status } from './types';

export async function getApplicantCasesByFormId(personalNumber: string, currentFormId: string) {
  const params = {
    TableName: config.cases.tableName,
    IndexName: 'PK-formId-gsi',
    KeyConditionExpression: 'PK = :pk and formId = :currentFormId',
    ExpressionAttributeValues: { ':pk': `USER#${personalNumber}`, ':currentFormId': currentFormId },
  };
  const [error, casesResponse] = await to<{
    Count: number;
    Items: {
      updatedAt: number;
      PK: string;
      SK: string;
      provider: string;
      formId: string;
      status: Status;
      details: Record<string, any>;
    }[];
    ScannedCount: number;
  }>(dynamoDb.call('query', params));
  if (error) {
    console.error(error);
    return undefined;
  }
  return casesResponse.Items;
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
