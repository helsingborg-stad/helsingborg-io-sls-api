import to from 'await-to-js';
import { throwError, ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';

export async function main(event) {
  const decodedToken = decodeToken(event);
  const { id } = event.pathParameters;

  const { personalNumber } = decodedToken;

  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;

  const params = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    Limit: 1,
  };

  const [caseDbError, caseDbResponse] = await to(sendCaseRequest(params));
  if (caseDbError) {
    return response.failure(caseDbError);
  }

  if (!caseDbResponse.Count) {
    return response.failure(new ResourceNotFoundError(`Case with id: ${id} not found`));
  }

  const [item] = caseDbResponse.Items;
  const attributes = objectWithoutProperties(item, ['PK', 'SK']);

  return response.success(200, {
    type: 'getCase',
    attributes: {
      ...attributes,
    },
  });
}

async function sendCaseRequest(params) {
  const [dynamoDbCallError, dynamoDbCallResult] = await to(dynamoDb.call('query', params));
  if (dynamoDbCallError) {
    throwError(dynamoDbCallError.statusCode, dynamoDbCallError.message);
  }

  return dynamoDbCallResult;
}
