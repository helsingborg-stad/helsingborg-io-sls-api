import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import log from '../../../libs/logs';
import * as dynamoDb from '../../../libs/dynamoDb';

export const main = async (event, context) => {
  const query = event.pathParameters?.query;

  if (!query) {
    return response.failure({
      status: 400,
      message: 'Missing required parameter: "query"',
    });
  }

  const emailRegex = /.*@.*\..*/;
  const isEmail = emailRegex.test(query);

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

  const [error, userGetResponse] = await to(dynamoDb.call(action, params));
  if (error) {
    log.error(
      'Fetch reference code request error',
      context.awsRequestId,
      'service-users-api-fetchReferenceCode-001',
      error
    );
    const errorMessage = 'Internal server error';
    return response.failure({
      status: 500,
      message: errorMessage,
    });
  }

  if (
    (isEmail && userGetResponse.Count === 0) ||
    (!isEmail && (userGetResponse.Item === undefined || userGetResponse.Item === {}))
  ) {
    const errorMessage = 'No user with that personal number or email found in the database.';
    log.warn(errorMessage, context.awsRequestId, 'service-users-api-fetchReferenceCode-002', error);
    return response.failure({
      status: 404,
      message: errorMessage,
    });
  }

  const user = isEmail ? userGetResponse.Items[0] : userGetResponse.Item;

  return response.success(200, {
    type: 'userFetchReferenceCode',
    referenceCode: user.uuid,
  });
};
