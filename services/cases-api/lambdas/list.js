import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Handler function for retrieving user cases from dynamodb
 */
export async function main(event) {
  const userId = event.headers.Authorization;
  const casePartitionKey = `USER#${userId}`;
  const caseSortKey = casePartitionKey;

  const params = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': casePartitionKey,
      ':sk': caseSortKey,
    },
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  };

  const [error, queryResponse] = await to(sendListCasesRequest(params));
  if (error) return response.failure(error);

  if (queryResponse.Count > 0) {
    const cases = queryResponse.Items.map(item => {
      const filteredItem = omitObjectKeys(item, ['ITEM_TYPE', 'PK', 'SK']);

      return filteredItem;
    });

    return response.success(200, cases);
  } else {
    return response.success(200, {
      type: 'cases',
      message: 'Items not found',
    });
  }
}

async function sendListCasesRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  if (error) throwError(error.statusCode);
  return result;
}

function omitObjectKeys(obj, keys) {
  return Object.keys(obj).reduce(
    (item, key) => {
      if (keys.indexOf(key) >= 0) {
        delete item[key];
      }
      return item;
    },
    { ...obj }
  );
}
