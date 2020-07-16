import to from 'await-to-js';
import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { buildResponse } from '../../../libs/response';

/**
 * Function for deleting form by id in dynamodb
 */
export const main = async event => {
  const { formId } = event.pathParameters;
  const PK = `FORM#${formId}`;

  const params = {
    TableName: config.forms3.tableName,
    Key: {
      PK,
    },
  };

  const [error, dbResponse] = await to(sendFormDeleteRequest(params));
  if (error) return buildResponse(error.status, error.message);
  return buildResponse(200, dbResponse);
};

async function sendFormDeleteRequest(params) {
  const [error, dbResponse] = await to(dynamoDb.call('delete', params));
  if (error) return buildResponse(error.status, error.message);
  return dbResponse;
}
