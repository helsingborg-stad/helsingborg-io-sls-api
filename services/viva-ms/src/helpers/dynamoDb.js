import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import { CASE_HTML_GENERATED, VIVA_APPLICATION_RECEIVED } from '../libs/constants';

export function getClosedUserCases(partitionKey) {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': partitionKey,
      ':statusTypeClosed': 'closed',
    },
  };
  return dynamoDb.call('query', queryParams);
}

export function updateVivaCaseState(caseItem) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
    UpdateExpression: 'SET #state = :newState',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newState': CASE_HTML_GENERATED,
    },
    ReturnValues: 'NONE',
  };
  return dynamoDb.call('update', updateParams);
}

export function updateCaseExpirationTime(caseUpdateParams) {
  const { caseKeys, newExpirationTime } = caseUpdateParams;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET expirationTime = :newExpirationTime',
    ExpressionAttributeValues: {
      ':newExpirationTime': newExpirationTime,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export function updateVivaCase(caseKeys, workflowId) {
  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #state = :newState, #details.#workflowId = :newWorkflowId',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#details': 'details',
      '#workflowId': 'workflowId',
    },
    ExpressionAttributeValues: {
      ':newWorkflowId': workflowId,
      ':newState': VIVA_APPLICATION_RECEIVED,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
