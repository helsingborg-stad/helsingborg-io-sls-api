import to from 'await-to-js';
import uuid from 'uuid';

import * as response from '../libs/response';
import config from '../libs/config';
import { validateFormData } from '../helpers/formValidation';
import { putItem } from '../libs/queries';
import log from '../libs/logs';

/**
 * Handler function for creating a form and saving it to a dynamodb.
 */
export async function main(event, context) {
  const requestBody = JSON.parse(event.body);

  //validates the incoming data
  const validationErrors = validateFormData(requestBody);
  if (validationErrors) {
    log.error(
      'Validation error',
      context.awsRequestId,
      'service-forms-api-createForm-001',
      validationErrors
    );

    return response.failure({
      status: 400,
      code: 400,
      message: 'Validation error',
      detail: validationErrors,
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
  if (dynamodbError) {
    log.error(
      'DynamoDB error',
      context.awsRequestId,
      'service-cases-api-createForm-002',
      dynamodbError
    );

    return response.failure({
      status: dynamodbError.status,
      code: dynamodbError.status,
      errorType: 'DynamoDB error',
      errorObject: dynamodbError,
    });
  }

  return response.success(201, {
    Item,
  });
}
