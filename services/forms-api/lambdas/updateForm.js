import to from 'await-to-js';
import { buildResponse } from '../../../libs/response';
import { objectWithoutProperties } from '../../../libs/objects';
import config from '../../../config';
import { validateFormData } from '../helpers/formValidation';
import * as dynamoDb from '../../../libs/dynamoDb';

const forbiddenKeys = ['id', 'PK', 'createdAt'];

/**
 * Handler function for updating a form in dynamoDB
 * The body should contain a JSON object corresponding to the updated form.
 */
export async function main(event) {
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
    return buildResponse(400, { errorMessage: 'Invalid update.', updateErrors });
  }
  const validationErrors = validateFormData(requestBody, true);
  if (validationErrors) {
    return buildResponse(400, {
      errorType: 'Validation error',
      errorDescriptions: validationErrors,
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
  if (error) return buildResponse(error.status, error);

  return buildResponse(200, dynamoDbResponse);
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
