/* eslint-disable no-console */
import * as errorHandler from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDB from '../../../libs/dynamoDb';
import { putEvent } from '../../../libs/awsEventBridge';

export async function main(event) {
  const userDetail = event.detail;
  const { personalNumber } = userDetail;

  const [getUserError, userItem] = await to(getUser(personalNumber));
  if (getUserError) {
    return console.error('(users-ms)', getUserError);
  }

  if (userItem == undefined) {
    console.log(
      `User with personal number: ${personalNumber}, could not be found in the users table.`
    );
    const [emitError] = await to(emitEventUserNotFound(userDetail));
    if (emitError) {
      throw new InternalServerError(emitError);
    }
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

  const [getError, getResult] = await to(dynamoDB.call('get', params));
  if (getError) {
    throw new errorHandler.InternalServerError(getError);
  }

  return getResult.Item;
}

async function emitEventUserNotFound(user) {
  return putEvent(user, 'usersMsFindUserUnsucceeded', 'usersMs.findUser');
}
