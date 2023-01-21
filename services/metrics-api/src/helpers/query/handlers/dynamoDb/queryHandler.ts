import DynamoDb from 'aws-sdk/clients/dynamodb';
import type { QueryInput } from 'aws-sdk/clients/dynamodb';
import type { DynamoQueryHandler, QueryParams } from './types';

const dynamoDbClient = new DynamoDb.DocumentClient({ apiVersion: '2012-08-10' });

export const dynamoQueryHandler: DynamoQueryHandler = {
  async query<T>(tableName: string, params: QueryParams): Promise<T> {
    const { pk, value, index } = params;
    const queryParams: QueryInput = {
      TableName: tableName,
      KeyConditionExpression: '#pk = :value',
      ExpressionAttributeNames: { '#pk': pk },
      ExpressionAttributeValues: { ':value': { S: value } },
      ...(index && { IndexName: index }),
    };
    const result = await dynamoDbClient.query(queryParams).promise();
    return result.Items as unknown as T;
  },
};
