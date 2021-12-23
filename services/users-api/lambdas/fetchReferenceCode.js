import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';

/**
 * Get the referenceCode associated with the user that has the given email or PN
 */
export const main = async (event, context) => {
  const body = JSON.parse(event.body);

  const { query } = body;
  const isEmail = query.includes('@');

  const action = isEmail ? 'query' : 'get';
  let params;

  if (isEmail) {
    params = {
      TableName: config.users.tableName,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e_mail',
      ExpressionAttributeValues: {
        ':e_mail': `${query}`,
      },
    };
  } else {
    params = {
      TableName: config.users.tableName,
      Key: {
        personalNumber: query,
      },
    };
  }

  const [error, userGetResponse] = await to(retrieveUser(action, params));
  if (error) {
    log.error(
      'Fetch reference code request error',
      context.awsRequestId,
      'service-users-api-fetchReferenceCode-500',
      error
    );
    return response.failure(error);
  }

  //Returning no results from the db is not an error, so we need to check for this separately,
  //and return a 404 if no results were found
  if (
    (isEmail && userGetResponse.Count === 0) ||
    (!isEmail && (userGetResponse.Item === undefined || userGetResponse.Item === {}))
  ) {
    const errorMessage = 'No user with that personal number or email found in the database.';
    log.warn(errorMessage, context.awsRequestId, 'service-users-api-fetchReferenceCode-404', error);
    return response.buildResponse(404, {
      type: 'userFetchReferenceCode',
      errorMessage: errorMessage,
    });
  }

  const user = isEmail ? userGetResponse.Items[0] : userGetResponse.Item;

  return response.buildResponse(200, {
    type: 'userFetchReferenceCode',
    referenceCode: user.uuid,
  });
};

async function retrieveUser(action, params) {
  const [error, dbResponse] = await to(dynamoDb.call(action, params));
  if (!dbResponse) throwError(error);
  return dbResponse;
}
