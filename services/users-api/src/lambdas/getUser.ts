import to from 'await-to-js';
import {
  InternalServerError,
  ResourceNotFoundError,
} from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';

export async function main(event, context) {
  const decodedToken = decodeToken(event);

  const [getUserError, getUserResponse] = await to(getUser(decodedToken.personalNumber));
  if (getUserError) {
    log.error(
      'Get user request error',
      context.awsRequestId,
      'service-users-api-getUser-001',
      getUserError
    );

    return response.failure(new InternalServerError(getUserError));
  }

  const user = getUserResponse.Item;

  if (!user) {
    const errorMessage = 'No user with provided personal number found in the users table';
    log.warn(errorMessage, context.awsRequestId, 'services-users-api-getUser-001', errorMessage);

    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  return response.success(200, {
    type: 'getUser',
    attributes: {
      item: user,
    },
  });
};

function getUser(personalNumber) {
  const getParams = {
    TableName: config.users.tableName,
    Key: {
      personalNumber
    },
  };

  return dynamoDb.call('get', getParams);
}
