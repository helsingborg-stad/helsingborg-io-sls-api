import uuid from 'uuid';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import putUserEvent from '../helpers/putUserEvent';
import log from '../libs/logs';

export async function main(event) {
  const { user } = event.detail;

  const checkFirstTimeLoginUserDetailKeys = ['personalNumber', 'firstName', 'lastName'].every(
    property =>
      // eslint-disable-next-line no-prototype-builtins
      user.hasOwnProperty(property)
  );

  if (checkFirstTimeLoginUserDetailKeys) {
    await addUserToDynamoDb(user);
    await putUserEvent.createSuccess(event.detail);
    log.writeInfo('User successfully added to the users table');
  }

  return true;
}

async function addUserToDynamoDb(params) {
  const putParams = {
    TableName: config.users.tableName,
    Item: {
      uuid: uuid.v1(),
      createdAt: Date.now(),
      email: null,
      mobilePhone: null,
      address: null,
      civilStatus: null,
      ...params,
    },
  };

  return dynamoDb.call('put', putParams);
}
