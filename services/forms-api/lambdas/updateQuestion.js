import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import { createUpdateExpression, updateItem } from '../helpers/queries';

export async function main(event) {
  const { formId, stepId, questionId } = event.pathParameters;
  const questionPartitionKey = `FORM#${formId}`;
  const questionSortKey = `${questionPartitionKey}#STEP#${stepId}#QUESTION#${questionId}`;

  const requestBody = JSON.parse(event.body);
  let UpdateExpression = '';
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  const validKeys = ['label', 'description', 'show', 'type'];

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
      questionSortKey,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    )
  );
  if (error) return response.failure(error);

  return response.success(200, {
    formId,
    stepId,
    questionId,
    attributes: {
      label: queryResponse.Attributes.label,
      description: queryResponse.Attributes.description,
      show: queryResponse.Attributes.show,
      type: queryResponse.Attributes.type,
    },
  });
}
