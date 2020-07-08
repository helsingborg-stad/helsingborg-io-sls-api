import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import { updateItem } from '../helpers/queries';

export async function main(event) {
  const { formId, stepId, questionId } = event.pathParameters;
  const questionPartitionKey = `FORM#${formId}`;
  const questionSortKey = `${questionPartitionKey}#STEP#${stepId}#QUESTION#${questionId}`;

  const requestBody = JSON.parse(event.body);

  const validKeys = ['label', 'description', 'show', 'type'];

  const [error, queryResponse] = await to(
    updateItem(
      config.forms.tableName,
      questionPartitionKey,
      questionSortKey,
      requestBody,
      validKeys
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
