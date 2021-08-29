/* eslint-disable no-console */
import to from 'await-to-js';

import uuid from 'uuid';
import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

export async function main(event) {
  const userDetail = event.detail;

  const [putUserRequestError, putUserResponse] = await to(putUserRequest(userDetail));
  if (putUserRequestError) {
    return console.error('(users-ms) putUserRequestError', putUserRequestError);
  }

  console.info('(users-ms) putUserResponse', putUserResponse);
  return true;
}

async function putUserRequest(userDetail) {
  const params = {
    TableName: config.users.tableName,
    Item: {
      uuid: uuid.v1(),
      createdAt: Date.now(),
      email: null,
      mobilePhone: null,
      ...userDetail,
    },
  };

  return dynamoDb.call('put', params);
}
