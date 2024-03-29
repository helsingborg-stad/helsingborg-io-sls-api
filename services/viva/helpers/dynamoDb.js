import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import { CASE_PROVIDER_VIVA, VIVA_APPLICATION_RECEIVED } from '../libs/constants';

import caseHelper from './createCase';

export function getCaseListByPeriod(personalNumber, application) {
  const personalNumberVerified = caseHelper.stripNonNumericalCharacters(personalNumber);
  const { startDate, endDate } = caseHelper.getPeriodInMilliseconds(application.period);

  const casesQueryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      'details.period.startDate = :periodStartDate AND details.period.endDate = :periodEndDate',
    ExpressionAttributeValues: {
      ':pk': `USER#${personalNumberVerified}`,
      ':periodStartDate': startDate,
      ':periodEndDate': endDate,
    },
  };

  return dynamoDb.call('query', casesQueryParams);
}

export async function getLastUpdatedCase(PK) {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed) and #provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
      '#provider': 'provider',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeClosed': 'closed',
      ':provider': CASE_PROVIDER_VIVA,
    },
  };

  const queryResponse = await dynamoDb.call('query', queryParams);
  const sortedCases = queryResponse.Items.sort((a, b) => b.updatedAt - a.updatedAt);
  return sortedCases?.[0];
}

export async function getFormTemplates(formIdList) {
  const formTemplateList = await Promise.all(
    formIdList.map(formId => {
      const getParams = {
        TableName: config.forms.tableName,
        Key: { PK: `FORM#${formId}` },
      };
      return dynamoDb.call('get', getParams);
    })
  );

  return formTemplateList.reduce(
    (accumulatedFormList, currentForm) => ({
      ...accumulatedFormList,
      [currentForm.Item.id]: currentForm.Item,
    }),
    {}
  );
}

export function updateVivaCase(caseKeys, workflowId) {
  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #state = :newState, details.workflowId = :newWorkflowId',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newWorkflowId': workflowId,
      ':newState': VIVA_APPLICATION_RECEIVED,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}

export function destructRecord(record) {
  const body = JSON.parse(record.body);
  return dynamoDb.unmarshall(body.detail.dynamodb.NewImage);
}
