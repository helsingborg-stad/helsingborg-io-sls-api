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

  const TableName = config.cases.tableName;

  // todo: implement condition params
  const params = {
    TableName,
    Key: {
      id,
    },
  };

  const [error, casesDeleteResponse] = await to(sendCasesDeleteRequest(params));
  if (!casesDeleteResponse) {
    return response.failure(error);
  }

  return response.success(200, {
    type: 'deleteCase',
    attributes: {
      ...casesDeleteResponse,
    },
  });
};

async function sendCasesDeleteRequest(params) {
  const [error, response] = await to(dynamoDb.call('deleteItem', params));
  if (!error) {
    throwError(error);
  }
  return response;
}
