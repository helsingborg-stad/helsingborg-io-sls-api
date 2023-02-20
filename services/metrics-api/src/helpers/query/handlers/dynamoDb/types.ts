export interface QueryParams {
  pk: string;
  value: string;
  index?: string;
  projection?: string;
}

export interface DynamoQueryHandler {
  query<T>(tableName: string, params: QueryParams): Promise<T>;
}
