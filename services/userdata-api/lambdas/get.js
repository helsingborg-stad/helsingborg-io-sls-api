import to from 'await-to-js';

// import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get users (GET)
export const main = async event => {
  const params = {
    TableName: 'user',
  };

  const [error, result] = await to(dynamoDb.call('scan', params));

  if (error) {
    return response.failure({
      status: false,
      code: 503,
      name: 'User',
      detail: event,
      stack: null,
    });
  }

  return response.success(result);
};
