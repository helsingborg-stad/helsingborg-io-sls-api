/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import uuid from 'uuid';

import config from '../../../config';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import { getItem, putItem } from '../../../libs/queries';

import caseValidationSchema from '../helpers/schema';
import { getFutureTimestamp, millisecondsToSeconds } from '../helpers/timestampHelper';
import { CASE_EXPIRATION_HOURS } from '../../../libs/constants';

export async function main(event) {
  const decodedToken = decodeToken(event);

  const [parseJsonError, parsedJson] = await to(parseJson(event.body));
  if (parseJsonError) {
    return response.failure(parseJsonError);
  }

  const [validationError, validatedEventBody] = await to(
    validateEventBody(parsedJson, caseValidationSchema)
  );
  if (validationError) {
    return response.failure(validationError);
  }

  const { provider, details, status, forms } = validatedEventBody;
  const { personalNumber } = decodedToken;
  const id = uuid.v4();
  const PK = `USER#${personalNumber}`;
  const SK = `USER#${personalNumber}#CASE#${id}`;
  const timestamp = Date.now();
  const expirationTime = millisecondsToSeconds(getFutureTimestamp(CASE_EXPIRATION_HOURS));

  const Item = {
    PK,
    SK,
    id,
    provider,
    details,
    status,
    forms,
    updatedAt: timestamp,
    createdAt: timestamp,
    expirationTime,
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
    return response.failure(getItemError.statusCode, getItemError.message);
  }

  return response.success(201, {
    type: 'createCase',
    attributes: {
      id: caseItem.Item.id,
      provider: caseItem.Item.provider,
      details: caseItem.Item.details,
      status: caseItem.Item.status,
      forms: caseItem.Item.forms,
      updatedAt: caseItem.Item.updatedAt,
      createdAt: caseItem.Item.createdAt,
      expirationTime: caseItem.Item.expirationTime,
    },
  });
}

async function validateEventBody(eventBody, schema) {
  const { validateError, validatedEventBody } = schema.validate(eventBody, { abortEarly: false });
  if (validateError) {
    throwError(400, validateError.message.replace(/"/g, "'"));
  }

  return validatedEventBody;
}

async function parseJson(data) {
  try {
    const parsedJson = JSON.parse(data);
    return parsedJson;
  } catch (JSONParseError) {
    throwError(400, JSONParseError.message);
  }
}
