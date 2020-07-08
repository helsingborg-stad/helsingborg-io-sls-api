import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import { updateItem } from '../helpers/queries';

export async function main(event) {
  const { formId } = event.pathParameters;
  const questionPartitionKey = `FORM#${formId}`;

  const requestBody = JSON.parse(event.body);

  const validKeys = ['description', 'name'];

  const [error, queryResponse] = await to(
    updateItem(
      config.forms.tableName,
      questionPartitionKey,
      questionPartitionKey,
      requestBody,
      validKeys
    )
  );
  if (error) return response.failure(error);

  return response.success(200, {
    formId,
    attributes: {
      stepOrder: queryResponse.Attributes.stepOrder,
      description: queryResponse.Attributes.description,
      name: queryResponse.Attributes.name,
    },
  });
}
