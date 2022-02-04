/* eslint-disable no-console */
import to from 'await-to-js';
import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';

export async function getUserCase(personalNumber, id) {
  const [getUserApplicantCaseError, userApplicantCaseResult] = await to(
    getUserApplicantCase(personalNumber, id)
  );
  if (getUserApplicantCaseError) {
    throw getUserApplicantCaseError;
  }

  const [getCoApplicantCaseError, userCoApplicantCaseResult] = await to(
    getUserCoApplicantCase(personalNumber, id)
  );
  if (getCoApplicantCaseError) {
    throw getCoApplicantCaseError;
  }

  const concatAndDeDuplicateCase = (...userCaseList) => [...new Set([].concat(...userCaseList))];
  const userCaseList = concatAndDeDuplicateCase(
    userApplicantCaseResult.Items,
    userCoApplicantCaseResult.Items
  );

  const [userCase] = userCaseList.filter(Boolean);
  return userCase;
}

async function getUserApplicantCase(personalNumber, id) {
  const PK = `USER#${personalNumber}`;
  const SK = `CASE#${id}`;

  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    Limit: 1,
  };

  return dynamoDb.call('query', params);
}

async function getUserCoApplicantCase(personalNumber, id) {
  const GSI1 = `USER#${personalNumber}`;
  const SK = `CASE#${id}`;

  const params = {
    TableName: config.cases.tableName,
    IndexName: 'GSI1-SK-index',
    KeyConditionExpression: 'GSI1 = :gsi1 AND SK = :sk',
    ExpressionAttributeValues: {
      ':gsi1': GSI1,
      ':sk': SK,
    },
    Limit: 1,
  };

  return dynamoDb.call('query', params);
}
