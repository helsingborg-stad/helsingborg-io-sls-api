/* eslint-disable no-console */
import * as errorHandler from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDB from '../../../libs/dynamoDb';

export async function main(event) {
  const { user } = event.detail;

  const usersTablePartitionKey = `USER#${user}`;

  const [getUserError, userItem] = await to(getUser(usersTablePartitionKey));
  if (getUserError) {
    return console.error('(users-ms)', getUserError);
  }

  console.log('userItem', userItem);

  return true;
}

async function getUser(PK) {
  const personalNumber = PK.substring(5);
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
