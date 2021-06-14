import to from 'await-to-js';
import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';

export async function getUserApplicantCase(keys) {
  const { PK, SK } = keys;
  const queryParams = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    Limit: 1,
  };

  const [queryError, queryResult] = await to(dynamoDb.call('query', queryParams));
  if (queryError) {
    throw queryError;
  }

  return queryResult.Items[0] || null;
}
