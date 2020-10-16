import to from 'await-to-js';
import uuid from 'uuid';
import * as dynamoose from 'dynamoose';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import { CASE_ITEM_TYPE as ITEM_TYPE } from '../helpers/constants';
import { decodeToken } from '../../../libs/token';
import * as response from '../../../libs/response';

import casesSchema from '../schema/casesSchema';

// Create and set new DynamoDB instance
dynamoose.aws.ddb.set(new dynamoose.aws.sdk.DynamoDB());

const CasesModel = dynamoose.model(
  `${config.resourcesStage}-${config.cases.tableName}`,
  casesSchema,
  { create: false }
);

/**
 * Lambda handling post request preparing for storing user cases into AWS DynamoDB
 */
export async function main(event) {
  const decodedToken = decodeToken(event);
  const personalNumber = parseInt(decodedToken.personalNumber);
  const eventBody = JSON.parse(event.body);

  const id = uuid.v1();
  const PK = `USER#${personalNumber}`; // Partition key
  const SK = `USER#${personalNumber}#CASE#${id}`; // Sort key

  const casesDocument = new CasesModel({
    PK,
    SK,
    ITEM_TYPE,
    id,
    personalNumber,
    ...eventBody,
  });

  const [dynamoDbDocSaveError, dynamoDbDocSaveResponse] = await to(
    sendDynamoDbDocSaveRequest(casesDocument)
  );
  if (dynamoDbDocSaveError) {
    return response.failure(dynamoDbDocSaveError);
  }

  return response.success(201, {
    type: 'cases',
    id,
    attributes: {
      ...dynamoDbDocSaveResponse,
    },
  });
}

/**
 * Handler validate and saving the case document into AWS DynamoDB
 * A document is representing one item in a AWS DynamoDB table
 *
 * @param {Document}
 * @returns {Recently saved document item}
 */
async function sendDynamoDbDocSaveRequest(document) {
  const [documentSaveError, documentSaveResponse] = await to(document.save());

  if (documentSaveError) {
    throwError(400, documentSaveError.message);
  }

  return documentSaveResponse;
}
