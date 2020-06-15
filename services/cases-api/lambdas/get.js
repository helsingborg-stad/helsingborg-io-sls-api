import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get case by id
export const main = async event => {
  const { id } = event.pathParameters;

  const params = {
    TableName: config.cases.tableName,
    Key: {
      id,
    },
  };

  const [error, casesGetResponse] = await to(sendCasesGetRequest(params));
  if (!casesGetResponse) return response.failure(error);

  return response.success(200, {
    type: 'casesGet',
    attributes: {
      ...casesGetResponse,
    },
  });
};

async function sendCasesGetRequest(params) {
  const [dbError, dbResponse] = await to(dynamoDb.call('get', params));
  if (!dbResponse) throwError(dbError);
  return dbResponse;
}
