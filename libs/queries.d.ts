/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Get request towards dynomdb to retrive an item in a table.
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 */
export function getItem(TableName: string, PK: string, SK: string): Promise<[Error, any]>;
/**
 * Creating a new item in a dynamodb table.
 * @param {object} params The request params for the creation of a new item in a dynamodb table.
 */
export function putItem(params: object): Promise<any>;
/**
 * Checks if a item exists in a dynamoDB table.
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 * @param {string} errorMessage The error message to pass if a item does not exists
 */
export function itemExists(
  TableName: string,
  PK: string,
  SK: string,
  errorMessage?: string
): Promise<any>;
/**
 * Append a new item to a list in an item
 * @param {string} TableName The name of the dynamodb table
 * @param {string} PK The Partition Key to get in the table
 * @param {string} SK The Sort Key to look for in the table
 * @param {string} listName The attribute name of the list
 * @param {any} item The item to append to the list
 */
export function appendItemToList(
  tableName: any,
  PK: string,
  listName: string,
  item: any
): Promise<any>;
export function updateItem(TableName: any, PK: any, keys: any, validKeys: any): Promise<any>;
export function createUpdateExpression(
  validKeys: any,
  keys: any,
  ExpressionAttributeNames: any,
  ExpressionAttributeValues: any
): string;
