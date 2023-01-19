export interface QueryParams {
  key: string;
  value: string;
  index?: string;
}

export interface DynamoQueryHandler {
  query<T>(tableName: string, params: QueryParams): Promise<T>;
}
