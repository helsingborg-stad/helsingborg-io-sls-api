import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';
import { CASE_HTML_GENERATED } from '../../../libs/constants';

export async function getClosedUserCases(primaryKey) {
  const dynamoDbQueryCasesParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': primaryKey,
      ':sk': 'CASE#',
      ':statusTypeClosed': 'closed',
    },
  };
  return dynamoDb.call('query', dynamoDbQueryCasesParams);
}

export async function updateVivaCaseState(caseItem) {
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
