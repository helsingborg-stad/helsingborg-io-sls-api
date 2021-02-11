import to from 'await-to-js';
import { throwError, ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';

export async function main(event) {
  const decodedToken = decodeToken(event);

  const { personalNumber } = decodedToken;

  const PK = `USER#${personalNumber}`;
  const SK = PK;

  const params = {
    TableName: config.cases.tableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  };

  const [casesDbError, casesDbResponse] = await to(sendCasesRequest(params));
  if (casesDbError) {
    return response.failure(casesDbError);
  }

  if (!casesDbResponse.Count) {
    return response.failure(new ResourceNotFoundError('No cases found'));
  }

  const cases = casesDbResponse.Items.map(item => objectWithoutProperties(item, ['PK', 'SK']));

  return response.success(200, {
    type: 'getCases',
    attributes: {
      cases,
    },
  });
}

async function sendCasesRequest(params) {
  const [dynamoDbCallError, dynamoDbQueryResult] = await to(dynamoDb.call('query', params));
  if (dynamoDbCallError) {
    throwError(dynamoDbCallError.statusCode, dynamoDbCallError.message);
  }

  return dynamoDbQueryResult;
}
