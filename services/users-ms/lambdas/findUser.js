/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import putUserEvent from '../helpers/putUserEvent';

export async function main(event) {
  const userDetail = event.detail;

  const [getUserError, userItem] = await to(getUser(userDetail.personalNumber));
  if (getUserError) {
    return console.error('(users-ms: findUser) getUserError', getUserError);
  }

  if (userItem == undefined) {
    const [putEventError] = await to(putUserEvent.notFound(userDetail));
    if (putEventError) {
      return console.error('(users-ms: findUser) putEventError', putEventError);
    }
    return console.log('User could not be found in the users table');
  }

  const [putEventError] = await to(putUserEvent.exists(userDetail));
  if (putEventError) {
    return console.error('(users-ms: findUser) putEventError', putEventError);
  }

  console.info('User was found in the users table.');
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
