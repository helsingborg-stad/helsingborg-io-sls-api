/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { User } from './types';

interface DynamoDbQueryUsersResult {
  Count: number;
  Item: User;
  ScannedCount: number;
}

export async function getUser(personalNumber: string): Promise<User> {
  const dynamoDbGetUserParams = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [dynamoDbGetUserError, dynamoDbGetUsersResult] = await to<DynamoDbQueryUsersResult>(
    dynamoDb.call('get', dynamoDbGetUserParams)
  );
  if (dynamoDbGetUserError) {
    throw new Error(dynamoDbGetUserError.message);
  }

  return dynamoDbGetUsersResult.Item;
}
