/* eslint-disable no-console */
import to from 'await-to-js';
import uuid from 'uuid';

import config from '../../../config';

import * as response from '../../../libs/response';

import { decodeToken } from '../../../libs/token';
import { putItem } from '../../../libs/queries';

import caseValidationSchema from '../helpers/schema';
import { CASE_STATUS_ONGOING } from '../../../libs/constants';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

/**
 * Handler function for creating a case and store in dynamodb
 */
export async function main(event) {
  const decodedToken = decodeToken(event);

  const [validationError, validatedEventBody] = await to(
    validateCreateCaseRequestBody(event.body, caseValidationSchema)
  );
  if (validationError) {
    return response.failure(validationError);
  }

  // TODO: check if the passed formId exsists in the form dynamo table.

  const { formId, provider, ...rest } = validatedEventBody;
  const { personalNumber } = decodedToken;
  const id = uuid.v4();

  const caseItem = {
    TableName: config.cases.tableName,
    Item: {
      PK: `USER#${personalNumber}`,
      SK: `USER#${personalNumber}#CASE#${id}`,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: CASE_STATUS_ONGOING,
      details: {},
      answers: [],
      formId,
      provider,
      ...rest,
      ReturnValues: 'ALL_NEW',
    },
  };

  const [putItemError, createdCase] = await to(putItem(caseItem));
  if (putItemError) {
    return response.failure(putItemError);
  }

  return response.success(201, {
    type: 'createCases',
    attributes: {
      ...createdCase,
    },
  });
}

/**
 * Function for validating a json object towards a defined joi validation schema.
 * @param {object} body an json object to be validated.
 * @param {object} schema a joi validation schema
 */
async function validateCreateCaseRequestBody(eventBody, schema) {
  let dataObject = eventBody;

  try {
    dataObject = JSON.parse(dataObject);
  } catch (error) {
    throwError(400, error.message);
  }

  const { error, value } = schema.validate(dataObject, { abortEarly: false });
  if (error) {
    throwError(400, error.message.replace(/"/g, "'"));
  }

  return value;
}
