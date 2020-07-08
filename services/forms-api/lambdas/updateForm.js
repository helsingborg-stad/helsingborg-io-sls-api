import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import { createUpdateExpression, updateItem } from '../helpers/queries';

export async function main(event) {
  const { formId } = event.pathParameters;
  const questionPartitionKey = `FORM#${formId}`;

  const requestBody = JSON.parse(event.body);
  let UpdateExpression = '';
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  const validKeys = ['description', 'name'];

  UpdateExpression = createUpdateExpression(
    validKeys,
    requestBody,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  );

  const [error, queryResponse] = await to(
    updateItem(
      config.forms.tableName,
      questionPartitionKey,
      undefined,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
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
