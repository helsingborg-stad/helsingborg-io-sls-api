import to from 'await-to-js';

// import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get users (GET)
export const main = async event => {
  const { personalNumber } = event.pathParameters;

  const params = {
    TableName: 'users',
    KeyConditionExpression: '#pn = :pppp',
    ExpressionAttributeNames: {
      '#pn': 'personalNumber',
    },
    ExpressionAttributeValues: {
      ':pppp': personalNumber,
    },
  };

  const [error, result] = await to(dynamoDb.call('query', params));

  if (error) {
    return response.failure({
      status: false,
      code: 503,
      name: 'User',
      detail: event,
      stack: error,
    });
  }

  return response.success(result);
};
