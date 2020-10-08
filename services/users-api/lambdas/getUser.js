import to from 'await-to-js';
import camelCase from 'camelcase';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';

/**
 * Get the user with the personal number specified in the path
 */
export const main = async event => {
  const decodedToken = decodeToken(event);

  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber: decodedToken.personalNumber,
    },
  };

  const [error, userGetResponse] = await to(sendUserGetRequest(params));
  if (error) return response.failure(error);

  //convert to camelCase
  const attributes = {};
  Object.keys(userGetResponse).forEach(key => {
    attributes[camelCase(key)] = userGetResponse[key];
  });

  //Returning no results from the db is not an error, so we need to check for this separately,
  //and return a 404 if no results were found
  if (Object.keys(attributes).length === 0) {
    return response.buildResponse(404, {
      type: 'userGet',
      errorMessage: 'No user with that personal number found in the database.',
    });
  }

  return response.buildResponse(200, {
    type: 'userGet',
    attributes,
  });
};

async function sendUserGetRequest(params) {
  const [error, dbResponse] = await to(dynamoDb.call('get', params));
  if (!dbResponse) throwError(error);
  return dbResponse;
}
