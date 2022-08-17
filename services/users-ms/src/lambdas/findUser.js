import to from 'await-to-js';

import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import putUserEvent from '../helpers/putUserEvent';
import log from '../libs/logs';

export async function main(event) {
  const userDetail = event.detail;

  const userItem = await getUser(userDetail.personalNumber);
  if (userItem == undefined) {
    log.writeInfo('User not found in the users table', userItem);
    await putUserEvent.notFound(userDetail);
    return true;
  }

  await putUserEvent.exists(userItem);
  return true;
}

async function getUser(personalNumber) {
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [, getResult] = await to(dynamoDb.call('get', params));
  return getResult.Item;
}
