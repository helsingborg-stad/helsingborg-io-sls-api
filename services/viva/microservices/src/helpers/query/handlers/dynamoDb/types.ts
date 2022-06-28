export interface DynamoQueryHandler {
  get<T>(tableName: string, keys: { PK: string; SK?: string }): Promise<T>;
}
