/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { Case } from './types';

interface DynamoDbQueryUsersResult {
  Count: number;
  Item: Case;
  ScannedCount: number;
}

export async function getUser(personalNumber: string) {
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
    return console.error(dynamoDbGetUserError);
  }

  return dynamoDbGetUsersResult.Item;
}
