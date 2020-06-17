import to from 'await-to-js';
import uuid from 'uuid';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import { STEP_ITEM_TYPE } from '../helpers/constants';
import { putItem, itemExists } from '../helpers/queries';
import config from '../../../config';

/**
 * Function for adding steps to an existing form in dynamodb.
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);
  const { formId } = event.pathParameters;

  const stepId = uuid.v1();
  const formPartitionKey = `FORM#${formId}`;
  const stepSortKey = `FORM#${formId}#STEP#${stepId}`;

  const [formExistsError] = await to(itemExists(config.forms.tableName, formPartitionKey));
  if (formExistsError) return response.failure(formExistsError);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateStepRequestBody)
  );
  if (validateError) return response.failure(validateError);

  const params = {
    TableName: `forms`,
    Item: {
      PK: formPartitionKey,
      SK: stepSortKey,
      ITEM_TYPE: STEP_ITEM_TYPE,
      id: stepId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      previousStep: requestBody.previousStep ? requestBody.previousStep : '',
      nextStep: requestBody.nextStep ? requestBody.nextStep : '',
      show: requestBody.show,
      title: requestBody.title,
      description: requestBody.description,
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    type: 'forms',
    id: stepId,
    attributes: {
      message: 'ok',
      description: validatedEventBody.description,
    },
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateStepRequestBody(requestBody) {
  const keys = ['title', 'show'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
  }

  if (!(typeof requestBody.title === 'string')) {
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
      `The formId key should be of type string and not ${typeof requestBody.title}`,
    ];
  }
  if (!(typeof requestBody.show === 'boolean')) {
    return [
      false,
      400,
      `The formId key should be of type string and not ${typeof requestBody.title}`,
    ];
  }

  return [true];
}
