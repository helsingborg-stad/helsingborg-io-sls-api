import DynamoDb from 'aws-sdk/clients/dynamodb';
import type { ItemList, Key, QueryOutput } from 'aws-sdk/clients/dynamodb';
import type { DynamoQueryHandler, QueryParams } from './types';

const dynamoDbClient = new DynamoDb.DocumentClient({ apiVersion: '2012-08-10' });

export const dynamoQueryHandler: DynamoQueryHandler = {
  async query<T>(tableName: string, params: QueryParams): Promise<T> {
    const { pk, value, index } = params;
    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: '#pk = :value',
      ExpressionAttributeNames: { '#pk': pk },
      ExpressionAttributeValues: { ':value': value },
      ...(index && { IndexName: index }),
    };

    let nextKey: Key | undefined = undefined;
    const itemList: ItemList = [];

    do {
      const result: QueryOutput = await dynamoDbClient
        .query({ ...queryParams, ExclusiveStartKey: nextKey })
        .promise();
      itemList.push(...(result.Items ?? []));
      nextKey = result.LastEvaluatedKey;
    } while (nextKey);

    return itemList as unknown as T;
  },
};
