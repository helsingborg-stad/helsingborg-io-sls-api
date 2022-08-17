import uuid from 'uuid';

import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';

import putUserEvent from '../helpers/putUserEvent';
import log from '../libs/logs';

export async function main(event) {
  const userDetail = event.detail;

  const checkFirstTimeLoginUserDetailKeys = ['personalNumber', 'firstName', 'lastName'].every(
    property =>
      // eslint-disable-next-line no-prototype-builtins
      userDetail.hasOwnProperty(property)
  );

  if (checkFirstTimeLoginUserDetailKeys) {
    await addUserToDynamoDb(userDetail);
    await putUserEvent.createSuccess(userDetail);
    log.writeInfo('User successfully added to the users table');
  }

  return true;
}

async function addUserToDynamoDb(userDetail) {
  const putParams = {
    TableName: config.users.tableName,
    Item: {
      uuid: uuid.v1(),
      createdAt: Date.now(),
      email: null,
      mobilePhone: null,
      address: null,
      civilStatus: null,
      ...userDetail,
    },
  };

  return dynamoDb.call('put', putParams);
}
