import to from 'await-to-js';
import uuid from 'uuid';

import { buildResponse } from '../../../libs/response';
import config from '../../../config';
import { validateFormData } from '../helpers/formValidation';
import { putItem } from '../helpers/queries';

/**
 * Handler function for creating a form and saving it to a dynamodb.
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);

  //validates the incoming data
  const validationErrors = validateFormData(requestBody);
  if (validationErrors) {
    return buildResponse(400, {
      errorType: 'Validation error',
      errorDescriptions: validationErrors,
    });
  }

  const formId = uuid.v1();
  const formPartitionKey = `FORM#${formId}`;
  const Item = {
    id: formId,
    PK: formPartitionKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...requestBody,
  };

  const params = {
    TableName: config.forms.tableName,
    Item: Item,
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError)
    return buildResponse(dynamodbError.status, {
      errorType: 'DynamoDB error',
      errorObject: dynamodbError,
    });

  return buildResponse(201, {
    Item,
  });
}
