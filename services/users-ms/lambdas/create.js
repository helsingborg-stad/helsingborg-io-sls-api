import to from 'await-to-js';
import uuid from 'uuid';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// create user
export const main = async event => {
  const data = event.detail;

  const params = {
    TableName: config.users.tableName,
    Item: {
      uuid: uuid.v1(),
      createdAt: Date.now(),
      email: null,
      mobilePhone: null,
      ...data,
    },
  };

  const [error, createUserResponse] = await to(sendCreateUserRequest(params));
  if (!createUserResponse) return response.failure(error);

  return response.success(201, {
    type: 'createUser',
    attributes: {
      ...createUserResponse.rawParams.Item,
    },
  });
};

async function sendCreateUserRequest(params) {
  const [error, createUserResponse] = await to(dynamoDb.call('put', params));
  if (!createUserResponse) throwError(error);

  return createUserResponse;
}
