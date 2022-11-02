import to from 'await-to-js';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import * as response from '../libs/response';
import log from '../libs/logs';

/**
 * Function for deleting form by id in dynamodb
 */
// eslint-disable-next-line func-style
export const main = async (event, context) => {
  const { formId } = event.pathParameters;
  const PK = `FORM#${formId}`;

  const params = {
    TableName: config.forms.tableName,
    Key: {
      PK,
    },
  };

  const [error, dbResponse] = await to(sendFormDeleteRequest(params));
  if (error) {
    log.error(
      'Form delete request error',
      context.awsRequestId,
      'service-forms-api-deleteForm-001',
      error
    );

    return response.failure({
      status: error.status,
      code: error.status,
      message: error.message,
    });
  }
  return response.success(200, dbResponse);
};

async function sendFormDeleteRequest(params) {
  const [error, dbResponse] = await to(dynamoDb.call('delete', params));
  if (error)
    return response.failure({
      status: error.status,
      code: error.status,
      message: error.message,
    });
  return dbResponse;
}
