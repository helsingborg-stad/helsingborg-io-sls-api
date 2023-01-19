import DynamoDb from 'aws-sdk/clients/dynamodb';
import type { DynamoQueryHandler, QueryParams } from './types';

const dynamoDbClient = new DynamoDb.DocumentClient({ apiVersion: '2012-08-10' });

export const dynamoQueryHandler: DynamoQueryHandler = {
  async query<T>(tableName: string, params: QueryParams): Promise<T> {
    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: '#pk = :value',
      ExpressionAttributeNames: { '#pk': params.key },
      ExpressionAttributeValues: { ':value': params.value },
      ...(params.index && { IndexName: params.index }),
    };
    const result = await dynamoDbClient.query(queryParams).promise();
    return result.Items as unknown as T;
  },
};
