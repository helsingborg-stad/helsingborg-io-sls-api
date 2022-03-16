/* eslint-disable no-console */
import to from 'await-to-js';

import { v1 as uuid } from 'uuid';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';

import putUserEvent from '../helpers/putUserEvent';
import log from '../libs/logs';

export async function main(event, context) {
  const userDetail = event.detail;

  const [putUserRequestError] = await to(putUserRequest(userDetail));
  if (putUserRequestError) {
    log.error(
      'putUserRequestError',
      context.awsRequestId,
      'service-viva-ms-createUser-001',
      putUserRequestError
    );

    return;
  }

  const [putEventError] = await to(putUserEvent.createSuccess(userDetail));
  if (putEventError) {
    log.error(
      'putEventError',
      context.awsRequestId,
      'service-viva-ms-createUser-002',
      putEventError
    );

    return;
  }

  log.info(
    'User was successfully created in the users table.',
    context.awsRequestId,
    'service-viva-ms-createUser-003'
  );

  return true;
}

async function putUserRequest(userDetail) {
  const params = {
    TableName: config.users.tableName,
    Item: {
      uuid: uuid(),
      createdAt: Date.now(),
      email: null,
      mobilePhone: null,
      ...userDetail,
    },
  };

  return dynamoDb.call('put', params);
}
