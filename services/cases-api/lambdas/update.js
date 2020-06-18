import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Handler function for updateing user case by id from dynamodb
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

  const [error, casesUpdateResponse] = await to(sendCasesUpdateRequest(params));
  if (!casesUpdateResponse) return response.failure(error);

  return response.success(201, {
    type: 'casesUpdate',
    attributes: {
      ...casesUpdateResponse,
    },
  });
};

async function sendCasesUpdateRequest(params) {
  const [dbError, dbResponse] = await to(dynamoDb.call('updateItem', params));
  if (!dbResponse) throwError(dbError);
  return dbResponse;
}
