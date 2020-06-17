import to from 'await-to-js';
import uuid from 'uuid';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import config from '../../../config';
import { FORM_ITEM_TYPE } from '../helpers/constants';
import { putItem } from '../helpers/queries';

/**
 * Handler function for creating a form and saving it to a dynamodb.
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateFormRequestBody)
  );

  if (validateError) return response.failure(validateError);

  const formId = uuid.v1();
  const formPartitionKey = `FORM#${formId}`;

  const params = {
    TableName: config.forms.tableName,
    Item: {
      PK: formPartitionKey,
      SK: formPartitionKey,
      ITEM_TYPE: FORM_ITEM_TYPE,
      id: formId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      name: validatedEventBody.name,
      description: validatedEventBody.description,
      stepOrder: [],
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    type: 'forms',
    id: formId,
    attributes: {
      name: validatedEventBody.name,
      description: validatedEventBody.description,
    },
  });
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
