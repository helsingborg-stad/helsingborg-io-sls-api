/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

export const getUser = async (personalNumber: string) => {
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [usersDbError, usersDbResult] = await to<{ Item: Record<string, any> }>(
    dynamoDb.call('get', params)
  );
  if (usersDbError) {
    return console.error(usersDbError);
  }

  return usersDbResult.Item;
};
