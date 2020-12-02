/* eslint-disable no-console */
import to from 'await-to-js';
import uuid from 'uuid';

import config from '../../../config';

import * as response from '../../../libs/response';

import { decodeToken } from '../../../libs/token';
import { getItem, putItem } from '../../../libs/queries';

import caseValidationSchema from '../helpers/schema';
import { CASE_STATUS_ONGOING } from '../../../libs/constants';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

/**
 * Handler function for creating a case and store in dynamodb
 */
export async function main(event) {
  const decodedToken = decodeToken(event);

  const [parseJsonError, parsedJsonData] = await to(parseJsonData(event.body));
  if (parseJsonError) {
    return response.failure(parseJsonError);
  }

  const [validationError, validatedEventBody] = await to(
    validateEventBody(parsedJsonData, caseValidationSchema)
  );
  if (validationError) {
    return response.failure(validationError);
  }

  // TODO: check if the passed formId exsists in the form dynamo table.

  const { formId, provider, ...rest } = validatedEventBody;
  const { personalNumber } = decodedToken;
  const id = uuid.v4();
  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;
  const timestamp = Date.now();

  const Item = {
    PK,
    SK,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: CASE_STATUS_ONGOING,
    details: {},
    answers: [],
    formId,
    provider,
    ...rest,
  };

  const putItemParams = {
    TableName: config.cases.tableName,
    Item,
  };

  const [putItemError] = await to(putItem(putItemParams));
  if (putItemError) {
    return response.failure(putItemError);
  }

  // Since we cannot use the ReturnValues attribute on the DynamoDB putItem operation to return the created item,
  // we need to do a second request in order to retrive the item/case after successfull creation.
  // This can be found in the AWS docs https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnValues
  const [getItemError, caseItem] = await getItem(config.cases.tableName, PK, SK);
  if (getItemError) {
    return response.failure(getItemError);
  }

  return response.success(201, {
    type: 'createCase',
    attributes: {
      id: caseItem.Item.id,
      formId: caseItem.Item.formId,
      answers: caseItem.Item.answers,
      details: caseItem.Item.details,
      provider: caseItem.Item.provider,
      status: caseItem.Item.status,
      updatedAt: caseItem.Item.updatedAt,
      createdAt: caseItem.Item.createdAt,
    },
  });
}

/**
 * Function for validating a json object towards a defined joi validation schema.
 * @param {object} body an json object to be validated.
 * @param {object} schema a joi validation schema
 */
async function validateEventBody(eventBody, schema) {
  const { error, value } = schema.validate(eventBody, { abortEarly: false });
  if (error) {
    throwError(400, error.message.replace(/"/g, "'"));
  }

  return value;
}

/**
 * @param {string} data a valid json string
 * @returns a promise object
 */
async function parseJsonData(data) {
  try {
    const parsedJsonData = JSON.parse(data);
    return parsedJsonData;
  } catch (error) {
    throwError(400, error.message);
  }
}
