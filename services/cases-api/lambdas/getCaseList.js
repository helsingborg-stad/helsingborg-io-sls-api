import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';

/**
 * Handler function for retrieving user cases from dynamodb
 */
export async function main(event) {
  const decodedToken = decodeToken(event);
  const casePartitionKey = `USER#${decodedToken.personalNumber}`;
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
      const { id, ...attributes } = omitObjectKeys(item, [
        'ITEM_TYPE',
        // 'updatedAt',
        // 'createdAt',
        'PK',
        'SK',
      ]);

      return {
        type: 'cases',
        id,
        attributes,
      };
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
