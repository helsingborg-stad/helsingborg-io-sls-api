import to from 'await-to-js';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import { User } from './types';

interface DynamoDbQueryUsersResult {
  ConsumedCapacity: Record<string, any>;
  Item: User;
}

export async function getUser(personalNumber: string): Promise<DynamoDbQueryUsersResult['Item']> {
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
    throw dynamoDbGetUserError;
  }

  const user = dynamoDbGetUsersResult.Item;

  if (!user) {
    throw 'User not found';
  }

  return user;
}
