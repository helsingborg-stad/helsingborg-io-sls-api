/* eslint-disable no-console */
import to from 'await-to-js';

import uuid from 'uuid';
import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import putUserEvent from '../helpers/putUserEvent';
import log from '../../../libs/logs';

export async function main(event, context) {
  const userDetail = event.detail;

  const [putUserRequestError] = await to(putUserRequest(userDetail));
  if (putUserRequestError) {
    return console.error('(users-ms: createUser) putUserRequestError', putUserRequestError);
  }

  const [putEventError] = await to(putUserEvent.createSuccess(userDetail));
  if (putEventError) {
    return console.error('(users-ms: createUser) putEventError', putEventError);
  }
  console.info('(users-ms: createUser) User was successfully created in the users table.');
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
