import to from 'await-to-js';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import putUserEvent from '../helpers/putUserEvent';
import log from '../libs/logs';

export async function main(event) {
  const { user } = event.detail;

  const storedUser = await getUser(user.personalNumber);
  if (storedUser == undefined) {
    log.writeInfo('User not found in the users table', storedUser);
    await putUserEvent.notFound(user);
    return true;
  }

  await putUserEvent.exists({ user });
  return true;
}

async function getUser(personalNumber) {
  const getParams = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [, result] = await to(dynamoDb.call('get', getParams));
  return result.Item;
}
