import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import { decodeToken } from '../libs/token';
import log from '../libs/logs';

import type { CaseUser } from '../helpers/types';

interface GetUserResponse {
  Item: CaseUser;
}

interface HttpHeaders {
  Authorization: string;
}

export interface LambdaRequest {
  headers: HttpHeaders;
}

export interface Dependencies {
  decodeToken: (httpEvent: LambdaRequest) => { personalNumber: string };
  getUser: (personalNumber: string) => Promise<GetUserResponse>;
}

function fetchUser(personalNumber: string): Promise<GetUserResponse> {
  const getParams = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  return dynamoDb.call('get', getParams);
}

export async function getUser(input: LambdaRequest, dependencies: Dependencies) {
  const decodedToken = dependencies.decodeToken(input);

  const getUserResponse = await dependencies.getUser(decodedToken.personalNumber);
  const user = getUserResponse.Item;

  if (!user) {
    const errorMessage = 'No user with provided personal number found in the users table';
    log.writeWarn(errorMessage);

    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  return response.success(200, {
    type: 'getUser',
    attributes: {
      item: user,
    },
  });
}

export const main = log.wrap(event => {
  return getUser(event, {
    decodeToken,
    getUser: fetchUser,
  });
});
