import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';

export async function getCaseWhereUserIsApplicant(caseId, userPersonalNumber) {
  const PK = `USER#${userPersonalNumber}`;
  const SK = `${PK}#CASE#${caseId}`;

  const dynamoDbQueryParams = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    Limit: 1,
  };

  return dynamoDb.call('query', dynamoDbQueryParams);
}
