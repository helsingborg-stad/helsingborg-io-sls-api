/* eslint-disable no-console */
import * as errorHandler from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDB from '../../../libs/dynamoDb';

export async function main(event) {
  const { personalNumber } = event.detail;

  const [getUserError, userItem] = await to(getUser(personalNumber));
  if (getUserError) {
    return console.error('(users-ms)', getUserError);
  }

  console.log('userItem', userItem);

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
