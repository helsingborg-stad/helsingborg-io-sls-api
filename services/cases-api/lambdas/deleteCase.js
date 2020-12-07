import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

/**
 * Lambda deleting case by id from DynamoDB table cases
 */
export const main = async event => {
  const { id } = event.pathParameters;

  const deleteCaseParams = {
    TableName: config.cases.tableName,
    Key: {
      id,
    },
  };

  const [error, deleteCaseResponse] = await to(sendDeleteCaseRequest(deleteCaseParams));
  if (error) {
    return response.failure(error);
  }

  return response.success(200, {
    type: 'deleteCase',
    attributes: {
      ...deleteCaseResponse,
    },
  });
};

async function sendDeleteCaseRequest(params) {
  const [error, response] = await to(dynamoDb.call('delete', params));
  if (error) {
    throwError(400, error.message);
  }
  return response;
}
