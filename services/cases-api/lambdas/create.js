import to from 'await-to-js';
import uuid from 'uuid';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// create case
export const main = async event => {
  const data = event.detail;

  const params = {
    TableName: config.cases.tableName,
    Item: {
      uuid: uuid.v1(),
      createdAt: Date.now(),
      ...data,
    },
  };

  const [error, casesCreateResponse] = await to(sendCasesCreateRequest(params));
  if (!casesCreateResponse) return response.failure(error);

  return response.success(201, {
    type: 'casesCreate',
    attributes: {
      ...casesCreateResponse.rawParams.Item,
    },
  });
};

async function sendCasesCreateRequest(params) {
  const [dbError, dbResponse] = await to(dynamoDb.call('put', params));
  if (!dbResponse) throwError(dbError);
  return dbResponse;
}
