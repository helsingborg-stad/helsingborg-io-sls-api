import to from 'await-to-js';

import config from '../../../config';
import * as response from '../../../libs/response';
import { updateItem } from '../helpers/queries';

export async function main(event) {
  const { formId, stepId } = event.pathParameters;
  const questionPartitionKey = `FORM#${formId}`;
  const questionSortKey = `${questionPartitionKey}#STEP#${stepId}`;

  const requestBody = JSON.parse(event.body);

  const validKeys = ['title', 'description', 'show'];

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
    attributes: {
      description: queryResponse.Attributes.description,
      show: queryResponse.Attributes.show,
      title: queryResponse.Attributes.title,
    },
  });
}
