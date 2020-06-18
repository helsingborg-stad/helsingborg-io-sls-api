import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Handler function for deleting user case by id in dynamodb
 */
export const main = async event => {
  const { id } = event.pathParameters;

  // todo: implement condition params
  const params = {
    TableName: config.cases.tableName,
    Key: {
      id,
    },
  };

  const [error, casesDeleteResponse] = await to(sendCasesDeleteRequest(params));
  if (!casesDeleteResponse) return response.failure(error);

  return response.success(200, {
    type: 'casesUpdate',
    attributes: {
      ...casesDeleteResponse,
    },
  });
};

async function sendCasesDeleteRequest(params) {
  const [dbError, dbResponse] = await to(dynamoDb.call('deleteItem', params));
  if (!dbResponse) throwError(dbError);
  return dbResponse;
}
