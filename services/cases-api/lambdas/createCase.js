import to from 'await-to-js';
import uuid from 'uuid';

import config from '../../../config';

import * as response from '../../../libs/response';
import { validateEventBody } from '../../../libs/validateEventBody';
import { validateKeys } from '../../../libs/validateKeys';
import { decodeToken } from '../../../libs/token';
import { putItem } from '../../../libs/queries';

/**
 * Handler function for creating a case and store in dynamodb
 */
export async function main(event) {
  const decodedToken = decodeToken(event);
  const requestBody = JSON.parse(event.body);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateCaseRequestBody)
  );

  if (validateError) {
    return response.failure(validateError);
  }

  const TableName = config.cases.tableName;

  const id = uuid.v1();
  const createdAt = Date.now();
  const updatedAt = Date.now();

  const { personalNumber } = decodedToken;
  const { provider, formId, status, details, answers } = validatedEventBody;

  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;

  const caseItem = {
    TableName,
    Item: {
      PK,
      SK,
      id,
      provider,
      formId,
      status,
      details,
      answers,
      createdAt,
      updatedAt,
    },
  };

  const [dynamodbError] = await to(putItem(caseItem));
  if (dynamodbError) {
    return response.failure(dynamodbError);
  }

  return response.success(201, {
    type: 'createCases',
    attributes: {
      message: 'Case created successfully!',
      id,
      formId,
      answers,
    },
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateCaseRequestBody(requestBody) {
  const keys = ['provider', 'formId', 'status', 'details', 'answers'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400, 'missing one of more of [provider, formId, status, details, answers]'];
  }

  if (typeof requestBody.provider !== 'string') {
    return [
      false,
      400,
      `provider key should be of type string [VIVA]. Got ${typeof requestBody.provider}`,
    ];
  }

  if (typeof requestBody.status !== 'string') {
    return [
      false,
      400,
      `status key should be of type string [submitted | ongiong]. Got ${typeof requestBody.status}`,
    ];
  }

  if (typeof requestBody.formId !== 'string') {
    return [false, 400, `formId key should be of type string. Got ${typeof requestBody.formId}`];
  }

  if (typeof requestBody.details !== 'object') {
    return [false, 400, `details key should be of type object. Got ${typeof requestBody.details}`];
  } else if (typeof requestBody.details.period !== 'object') {
    return [
      false,
      400,
      `details.period key should be of type object. Got ${typeof requestBody.details.period}`,
    ];
  } else if (typeof requestBody.details.period.startDate !== 'number') {
    return [
      false,
      400,
      `details.period.startDate key should be of type number. Got ${typeof requestBody.details
        .period.startDate}`,
    ];
  } else if (typeof requestBody.details.period.endDate !== 'number') {
    return [
      false,
      400,
      `details.period.endDate key should be of type number. Got ${typeof requestBody.details.period
        .endDate}`,
    ];
  }

  if (typeof requestBody.answers !== 'object') {
    return [false, 400, `answers key should be of type object. Got ${typeof requestBody.answers}`];
  }

  return [true];
}
