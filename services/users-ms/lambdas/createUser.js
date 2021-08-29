/* eslint-disable no-console */
import to from 'await-to-js';

import uuid from 'uuid';
import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { putEvent } from '../../../libs/awsEventBridge';

export async function main(event) {
  const userDetail = event.detail;

  const [putUserRequestError] = await to(putUserRequest(userDetail));
  if (putUserRequestError) {
    return console.error('(users-ms) putUserRequestError', putUserRequestError);
  }

  console.info('(users-ms) userDetail', userDetail);
  const [emitEventError] = await to(emitEventUserCreatedSuccess);
  if (emitEventError) {
    return console.error('(users-ms) create: emitEventError', emitEventError);
  }

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

async function emitEventUserCreatedSuccess(user) {
  return putEvent(user, 'usersMsCreateUserSuccess', 'usersMs.createUser');
}
