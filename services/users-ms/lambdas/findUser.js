/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { putEvent } from '../../../libs/awsEventBridge';

export async function main(event) {
  const userDetail = event.detail;
  const { personalNumber } = userDetail;

  const [getUserError, userItem] = await to(getUser(personalNumber));
  if (getUserError) {
    return console.error('(users-ms) getUserError', getUserError);
  }

  if (userItem == undefined) {
    const [emitEventError] = await to(emitEventUserNotFound(userDetail));
    if (emitEventError) {
      return console.error('(users-ms) emitEventError', emitEventError);
    }
    return console.log(
      `User with personal number: ${personalNumber}, could not be found in the users table.`
    );
  }

  console.info('User exists. All good to go!', userItem);
  return true;
}

async function getUser(personalNumber) {
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [getError, getResult] = await to(dynamoDb.call('get', params));
  if (getError) {
    throw getError;
  }

  return getResult.Item;
}

async function emitEventUserNotFound(user) {
  return putEvent(user, 'usersMsFindUserUnsucceeded', 'usersMs.findUser');
}
