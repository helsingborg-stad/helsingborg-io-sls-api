import to from 'await-to-js';
import uuid from 'uuid';

// import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// create (POST)
export const main = async event => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: 'users',
    Item: {
      userId: uuid.v1(),
      createdAt: Date.now(),
      ...data,
    },
  };

  const [error, result] = await to(dynamoDb.call('put', params));

  if (error) {
    return response.failure({
      status: false,
      code: 503,
      name: 'Put user',
      detail: event,
      stack: null,
    });
  }

  return response.success(result);
};
