import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

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

  const TableName = config.cases.tableName;

  const params = {
    TableName,
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  };

  const [error, casesGetResponse] = await to(sendListCasesRequest(params));
  if (error) return response.failure(error);

  if (!casesGetResponse.Count) {
    return response.success(404, {
      type: 'getCasesList',
      attributes: {
        message: `Cases not found`,
      },
    });
  }

  const cases = casesGetResponse.Items.map(item => {
    const attributes = objectWithoutProperties(item, ['PK', 'SK']);
    return attributes;
  });

  return response.success(200, {
    type: 'getCasesList',
    attributes: {
      cases,
    },
  });
}

async function sendListCasesRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  if (error) throwError(error.statusCode);
  return result;
}
