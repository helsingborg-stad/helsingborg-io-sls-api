import DynamoDb from 'aws-sdk/clients/dynamodb';

const dynamoDbClient = new DynamoDb.DocumentClient({ apiVersion: '2012-08-10' });

import { DynamoQueryHandler } from './types';

export const dynamoQueryHandler: DynamoQueryHandler = {
  async get<T>(tableName: string, keys: { PK: string; SK?: string }) {
    const parameters = {
      TableName: tableName,
      Key: {
        PK: keys.PK,
        ...(!!keys.SK && { SK: keys.SK }),
      },
    };

    const result = await dynamoDbClient.get(parameters).promise();
    return result.Item as T;
  },
};
