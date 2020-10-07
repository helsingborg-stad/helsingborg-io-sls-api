import to from 'await-to-js';
import uuid from 'uuid';
import * as dynamoose from 'dynamoose';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import config from '../../../config';
import { CASE_ITEM_TYPE as ITEM_TYPE } from '../helpers/constants';
import { decodeToken } from '../../../libs/token';
// todo: move to libs as it's used by forms too
import { putItem } from '../helpers/queries';

const ddb = new dynamoose.aws.sdk.DynamoDB();
dynamoose.aws.ddb.set(ddb);

const schema = new dynamoose.Schema(
  {
    id: String,
    age: Number,
  },
  {
    saveUnknown: true,
    timestamps: true,
  }
);

/**
 * Handler function for create and store case in DynamoDB
 */
export async function main(event) {
  const { personalNumber } = decodeToken(event);
  const requestBody = JSON.parse(event.body);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateCaseRequestBody)
  );

  if (validateError) return response.failure(validateError);

  const id = uuid.v1();
  const PK = `USER#${personalNumber}`; // Partition key
  const SK = `USER#${personalNumber}#CASE#${id}`; // Sort key
  const createdAt = Date.now();
  const updatedAt = Date.now();

  const { type, formId, status, data } = validatedEventBody;

  // Case item
  const params = {
    TableName: config.cases.tableName,
    Item: {
      PK,
      SK,
      ITEM_TYPE,
      id,
      createdAt,
      updatedAt,
      personalNumber,
      type,
      formId,
      status,
      data,
      // TODO: add meta to store viva period stuff
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    type: 'cases',
    id,
    attributes: {
      formId,
      personalNumber,
      type,
      status,
      data,
    },
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateCaseRequestBody(requestBody) {
  const keys = ['type', 'data', 'formId'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
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
