import to from 'await-to-js';
import snakeCaseKeys from 'snakecase-keys';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get users (GET)
export const main = async event => {
  const { personalNumber } = event.pathParameters;

  const params = {
    TableName: 'users',
    Key: {
      personalNumber,
    },
  };

  const [error, userGetResponse] = await to(sendUserGetRequest(params));
  if (!userGetResponse) return response.failure(error);

  return response.success({
    type: 'userGet',
    attributes: {
      ...snakeCaseKeys(userGetResponse),
    },
  });
};

async function sendUserGetRequest(params) {
  const [error, userGetResponse] = await to(dynamoDb.call('get', params));
  if (!userGetResponse) throwError(error);
  return userGetResponse;
}
