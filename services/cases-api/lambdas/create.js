import to from 'await-to-js';
import uuid from 'uuid';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import config from '../../../config';
import { CASE_ITEM_TYPE } from '../helpers/constants';

// todo: move to libs as it's used by forms too
import { putItem } from '../helpers/queries';

/**
 * Handler function for creating a case and store in dynamodb
 */
export async function main(event) {
  const requestBody = JSON.parse(event.body);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateCaseRequestBody)
  );

  if (validateError) return response.failure(validateError);

  const caseId = uuid.v1();
  const casePartitionKey = `USER#${validatedEventBody.personalNumber}`;
  const createdAt = Date.now();

  // Case item
  const params = {
    TableName: config.cases.tableName,
    Item: {
      PK: casePartitionKey,
      SK: `${casePartitionKey}#CASE#${caseId}`,
      ITEM_TYPE: CASE_ITEM_TYPE,
      id: caseId,
      createdAt: createdAt,
      updatedAt: createdAt,
      personalNumber: validatedEventBody.personalNumber,
      type: validatedEventBody.type,
      formId: validatedEventBody.formId,
      status: validatedEventBody.status,
      data: validatedEventBody.data,
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    id: caseId,
    formId: validatedEventBody.formId,
    personalNumber: validatedEventBody.personalNumber,
    type: validatedEventBody.type,
    status: validatedEventBody.status,
    data: validatedEventBody.data,
    createdAt: createdAt,
    updatedAt: createdAt,
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateCaseRequestBody(requestBody) {
  const keys = ['personalNumber', 'type', 'data', 'formId'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
  }

  if (typeof requestBody.personalNumber !== 'number') {
    return [
      false,
      400,
      `personalNumber key should be of type number. Got ${typeof requestBody.personalNumber}`,
    ];
  }

  if (typeof requestBody.type !== 'string') {
    return [false, 400, `type key should be of type string. Got ${typeof requestBody.type}`];
  }

  if (typeof requestBody.formId !== 'string') {
    return [false, 400, `formId key should be of type string. Got ${typeof requestBody.formId}`];
  }

  if (typeof requestBody.data !== 'object') {
    return [false, 400, `data key should be of type object. Got ${typeof requestBody.data}`];
  }

  return [true];
}
