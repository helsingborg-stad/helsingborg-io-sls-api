/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { Case, AnswerObject, Status } from './types';

export const getApplicantCasesByFormId = async (personalNumber: string, formId: string) => {
  const params = {
    TableName: config.cases.tableName,
    IndexName: 'PK-formId-gsi',
    KeyConditionExpression: 'PK = :pk and formId = :formId',
    ExpressionAttributeValues: { ':pk': `USER#${personalNumber}`, ':formId': formId },
  };
  const [error, casesResponse] = await to<{
    Count: number;
    Items: {
      answers: AnswerObject[];
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
};

export const getNewAndChangedValues = (
  currentCase: Case & {
    answersArray: AnswerObject[];
  },
  oldCase: { answers: AnswerObject[] }
) => {
  const changedValues: string[] = [];
  const newValues: string[] = [];

  currentCase.answersArray.forEach(answer => {
    const oldValue = oldCase.answers.find(oldAnswer => answer.field.id === oldAnswer.field.id);
    if (oldValue && oldValue.value !== answer.value) {
      changedValues.push(oldValue.field.id);
    } else if (!oldValue) {
      newValues.push(answer.field.id);
    }
  });
  return { changedValues, newValues };
};
