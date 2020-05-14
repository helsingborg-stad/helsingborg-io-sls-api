import to from 'await-to-js';
import uuid from 'uuid';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
/**
 * Function for creating a form and saving it to a dynamodb.
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);
  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateFormRequestBody)
  );
  if (validateError) return response.failure(validateError);
  const formId = uuid.v1();
  const params = {
    TableName: `${config.resourcesStage}-forms`,
    Item: {
      PK: `FORM#${formId}`,
      SK: `FORM#${formId}`,
      TYPE: 'FORM',
      formId: formId,
      createdAt: Date.now(),
      name: validatedEventBody.name,
      description: validatedEventBody.description,
    },
  };

  const [dynamodbError, createFormResponse] = await to(sendCreateFormRequest(params));
  if (dynamodbError) return response.failure(dynamodbError);
  return response.success(201, {
    type: 'forms',
    id: createFormResponse.rawParams.Item.formId,
    attributes: {
      name: createFormResponse.rawParams.Item.name,
      description: createFormResponse.rawParams.Item.description,
    },
  });
}

async function sendCreateFormRequest(params) {
  const [error, dynamoDbResponse] = await to(dynamoDb.call('put', params));
  if (error) throwError(error.statusCode);

  return dynamoDbResponse;
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateFormRequestBody(requestBody) {
  const keys = ['name', 'description'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
  }

  if (!(typeof requestBody.name === 'string')) {
    return [
      false,
      400,
      `The name key should be of type string and not ${typeof requestBody.title}`,
    ];
  }

  if (!(typeof requestBody.description === 'string')) {
    return [
      false,
      400,
      `The description key should be of type string and not ${typeof requestBody.title}`,
    ];
  }

  return [true];
}
