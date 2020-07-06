import to from 'await-to-js';
import uuid from 'uuid';

import config from '../../../config';
import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import { QUESTION_ITEM_TYPE } from '../helpers/constants';
import { putItem, itemExists } from '../helpers/queries';

/**
 * Function for adding questions to an existing step item in dynamodb.
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);
  const { formId, stepId } = event.pathParameters;
  const questionId = uuid.v1();

  const formPartitionKey = `FORM#${formId}`;
  const stepSortKey = `${formPartitionKey}#STEP#${stepId}`;
  const questionSortKey = `${stepSortKey}#QUESTION#${questionId}`;

  // Query DynamoDb table to check if a step item that the question should be added to exsists.
  const [formStepQueryError] = await to(
    itemExists(config.forms.tableName, formPartitionKey, stepSortKey)
  );
  if (formStepQueryError) return response.failure(formStepQueryError);

  // Validation of the event body before insertion to DynamoDb table
  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateStepRequestBody)
  );
  if (validateError) return response.failure(validateError);

  const { label, description, type, validations, ...other } = validatedEventBody;

  const params = {
    TableName: config.forms.tableName,
    Item: {
      PK: formPartitionKey,
      SK: questionSortKey,
      ITEM_TYPE: QUESTION_ITEM_TYPE,
      id: questionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      label,
      description,
      type,
      validations,
      ...other,
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    type: 'forms',
    id: formId,
    attributes: {
      label: requestBody.label,
      description: requestBody.description,
      fieldType: requestBody.type,
      validations: requestBody.validations,
      ...other,
    },
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateStepRequestBody(requestBody) {
  const keys = ['label', 'type', 'show'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
  }

  if (!(typeof requestBody.label === 'string')) {
    return [
      false,
      400,
      `The label key should be of type string and not ${typeof requestBody.label}`,
    ];
  }

  if (!(typeof requestBody.description === 'string')) {
    return [
      false,
      400,
      `The description key should be of type string and not ${typeof requestBody.description}`,
    ];
  }
  if (requestBody.show && requestBody.show === 'true') {
    requestBody.show = true;
  } else if (requestBody.show && requestBody.show === 'false') {
    requestBody.show = false;
  }
  if (!(typeof requestBody.show === 'boolean')) {
    return [
      false,
      400,
      `The show key should be of type boolean and not ${typeof requestBody.show}`,
    ];
  }
  if (
    requestBody.defaultAnswer &&
    (Array.isArray(requestBody.defaultAnswer) || !(typeof requestBody.defaultAnswer === 'string'))
  ) {
    return [
      false,
      400,
      `The key defaultAnswer should be of type string or array and not ${typeof requestBody.defaultAnswer}`,
    ];
  }
  return [true];
}
