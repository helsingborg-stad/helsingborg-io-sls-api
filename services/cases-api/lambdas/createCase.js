/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import uuid from 'uuid';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import { getItem, putItem } from '../../../libs/queries';

import { populateFormWithPreviousCaseAnswers } from '../../../libs/formAnswers';
import caseValidationSchema from '../helpers/schema';
import { getStatusByType } from '../../../libs/caseStatuses';

export async function main(event) {
  const decodedToken = decodeToken(event);

  const [parseJsonError, parsedJson] = await to(parseJsonD(event.body));
  if (parseJsonError) {
    return response.failure(parseJsonError);
  }

  const [validationError, validatedEventBody] = await to(
    validateEventBody(parsedJson, caseValidationSchema)
  );
  if (validationError) {
    return response.failure(validationError);
  }

  const { statusType, currentFormId, provider, details, forms: initialForms } = validatedEventBody;
  const { personalNumber } = decodedToken;

  const id = uuid.v4();

  const PK = `USER#${personalNumber}`;
  const SK = `CASE#${id}`;

  const [userError, user] = await to(getUser(personalNumber));
  if (userError) {
    console.error('(cases-api) DynamoDb query on users table failed', userError);
    return response.failure(userError);
  }
  const [, formTemplates] = await to(getFormTemplates(initialForms));
  const [previousCaseError, previousCase] = await to(getLastUpdatedCase(PK, provider));
  if (previousCaseError) {
    console.error('(cases-api) DynamoDb query on cases table failed', previousCaseError);
    return response.failure(previousCaseError);
  }

  const persons = [{ role: 'applicant', ...user }];

  const prePopulatedForms = populateFormWithPreviousCaseAnswers(
    initialForms,
    persons,
    formTemplates,
    previousCase?.forms || {}
  );

  const timestampNow = Date.now();

  const Item = {
    PK,
    SK,
    id,
    status: getStatusByType(statusType),
    currentFormId,
    provider,
    details,
    forms: prePopulatedForms,
    createdAt: timestampNow,
    updatedAt: timestampNow,
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
      status: caseItem.Item.status,
      currentFormId: caseItem.Item.currentFormId,
      provider: caseItem.Item.provider,
      details: caseItem.Item.details,
      forms: caseItem.Item.forms,
      updatedAt: caseItem.Item.updatedAt,
      createdAt: caseItem.Item.createdAt,
    },
  });
}

async function validateEventBody(eventBody, schema) {
  const { error, value } = schema.validate(eventBody, { abortEarly: false });
  if (error) {
    throwError(400, error.message.replace(/"/g, "'"));
  }

  return value;
}

async function parseJsonD(data) {
  try {
    const parsedJson = JSON.parse(data);
    return parsedJson;
  } catch (error) {
    throwError(400, error.message);
  }
}

async function getUser(personalNumber) {
  const params = {
    TableName: config.users.tableName,
    Key: {
      personalNumber,
    },
  };

  const [error, dbResponse] = await to(dynamoDb.call('get', params));
  if (error) {
    throwError(error.statusCode, error.message);
  }

  return dbResponse.Item;
}

async function getFormTemplates(forms) {
  const formTemplates = {};
  for (const key of Object.keys(forms)) {
    const params = {
      TableName: config.forms.tableName,
      Key: {
        PK: `FORM#${key}`,
      },
    };
    const [error, dbResponse] = await to(dynamoDb.call('get', params));

    if (error) {
      console.error('(cases-api) DynamoDb query on forms table failed', error);
      continue;
    }
    formTemplates[key] = dbResponse.Item;
  }

  return formTemplates;
}

async function getLastUpdatedCase(PK, provider) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed) and #provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
      '#provider': 'provider',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeClosed': 'closed',
      ':provider': provider,
    },
  };

  const [error, dbResponse] = await to(dynamoDb.call('query', params));
  if (error) {
    throwError(error.statusCode, error.message);
  }

  const sortedCases = dbResponse.Items.sort((a, b) => b.updatedAt - a.updatedAt);

  return sortedCases?.[0] || {};
}
