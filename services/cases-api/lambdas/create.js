import to from 'await-to-js';
import uuid from 'uuid';
import * as dynamoose from 'dynamoose';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import { CASE_ITEM_TYPE as ITEM_TYPE } from '../helpers/constants';
import { decodeToken } from '../../../libs/token';
import * as response from '../../../libs/response';

import casesSchema from '../schema/casesSchema';

const ddb = new dynamoose.aws.sdk.DynamoDB();
dynamoose.aws.ddb.set(ddb);

const Cases = dynamoose.model(`${config.resourcesStage}-${config.cases.tableName}`, casesSchema, {
  create: false,
});

/**
 * Handler create and store cases into AWS DynamoDB
 */
export async function main(event) {
  const { personalNumber } = decodeToken(event);
  const eventBody = JSON.parse(event.body);

  const id = uuid.v1();
  const PK = `USER#${personalNumber}`; // Partition key
  const SK = `USER#${personalNumber}#CASE#${id}`; // Sort key

  const casesDocument = new Cases({
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
 * @param {Document} document
 */
async function sendDynamoDbDocSaveRequest(document) {
  const [documentSaveError, documentSaveResponse] = await to(document.save());

  if (documentSaveError) {
    throwError(400, documentSaveError.message);
  }

  return documentSaveResponse;
}
