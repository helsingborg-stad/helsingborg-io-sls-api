import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';

// get users (GET)
export async function main(event) {
  const { formId } = event.pathParameters;
  const hashKey = `FORM#${formId}`;
  const params = {
    TableName: config.forms.tableName,
    Key: {
      PK: hashKey,
      SK: hashKey,
    },
  };

  const [error, formGetResponse] = await to(getFormRequest(params));
  if (error) return response.failure(error);

  return response.success(200, {
    type: 'forms',
    id: formGetResponse.Item.formId,
    attributes: {
      name: formGetResponse.Item.name,
      description: formGetResponse.Item.description,
      steps: [],
      logics: [],
    },
  });
}

async function getFormRequest(params) {
  const [error, result] = await to(dynamoDb.call('get', params));
  if (error) throwError(error.statusCode);
  return result;
}
