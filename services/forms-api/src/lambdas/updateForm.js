import to from 'await-to-js';
import * as response from '../libs/response';
import { objectWithoutProperties } from '../libs/objects';
import config from '../libs/config';
import { validateFormData } from '../helpers/formValidation';
import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';

const forbiddenKeys = ['id', 'PK', 'createdAt'];

/**
 * Handler function for updating a form in dynamoDB
 * The body should contain a JSON object corresponding to the updated form.
 */
export async function main(event, context) {
  const { formId } = event.pathParameters;
  const PK = `FORM#${formId}`;
  //remove forbidden keys so that they are not updated
  const requestBody = objectWithoutProperties(JSON.parse(event.body), forbiddenKeys);

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  const [updateErrors, UpdateExpression] = createUpdateExpression(
    requestBody,
    forbiddenKeys,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  );

  if (updateErrors) {
    log.error(
      'Update expression error',
      context.awsRequestId,
      'service-forms-api-updateForm-001',
      updateErrors
    );

    return response.failure({
      status: 400,
      code: 400,
      ...updateErrors,
      message: 'Invalid update.',
    });
  }
  const validationErrors = validateFormData(requestBody, true);
  if (validationErrors) {
    log.error(
      'Validation error',
      context.awsRequestId,
      'service-forms-api-updateForm-002',
      validationErrors
    );

    return response.failure({
      status: 400,
      code: 400,
      message: 'Validation error',
      detail: validationErrors,
    });
  }

  const params = {
    TableName: config.forms.tableName,
    Key: { PK },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [error, dynamoDbResponse] = await to(dynamoDb.call('update', params));
  if (error) {
    log.error('Form update error', context.awsRequestId, 'service-forms-api-updateForm-003', error);

    return response.failure({
      code: error.status,
      ...error,
    });
  }
  return response.success(200, dynamoDbResponse);
}

export function createUpdateExpression(
  newData,
  forbiddenKeys,
  ExpressionAttributeNames,
  ExpressionAttributeValues
) {
  const errors = [];
  let UpdateExpression = 'SET ';
  let keyCounter = Object.keys(newData).length;

  if (keyCounter > 0) {
    for (const key in newData) {
      UpdateExpression += `#${key} = :new${key}`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:new${key}`] = newData[key];

      if (keyCounter > 1) {
        UpdateExpression += ', ';
        keyCounter--;
      }
    }
  }
  return [errors.length > 0 ? errors : null, UpdateExpression];
}
