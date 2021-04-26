import to from 'await-to-js';
import { throwError, BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';
import { getStatusByType } from '../../../libs/caseStatuses';

import { getFutureTimestamp, millisecondsToSeconds } from '../../../libs/timestampHelper';
import {
  CASE_SUBMITTED_EXPIRATION_HOURS,
  CASE_ONGOING_EXPIRATION_HOURS,
} from '../../../libs/constants';

export async function main(event) {
  const requestJsonBody = JSON.parse(event.body);
  const { id } = event.pathParameters;

  if (!id) {
    return response.failure(new BadRequestError('missing [id] in query path'));
  }

  const {
    provider,
    statusType,
    details,
    currentFormId,
    currentPosition,
    answers,
  } = requestJsonBody;

  const UpdateExpression = ['SET updatedAt = :newUpdatedAt'];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = { ':newUpdatedAt': Date.now() };

  // // DynamoDb TTL uses seconds
  // const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(CASE_EXPIRATION_HOURS));
  // UpdateExpression.push('expirationTime = :newExpirationTime');
  // ExpressionAttributeValues[':newExpirationTime'] = newExpirationTime;

  if (provider) {
    UpdateExpression.push('provider = :newProvider');
    ExpressionAttributeValues[':newProvider'] = provider;
  }

  if (statusType) {
    const status = getStatusByType(statusType);
    if (!status) {
      return response.failure(new BadRequestError('invalid [statusType]'));
    }

    let expireHours = undefined;

    /**
     * If the case is being updated to set the status to 'active:ongoing' or 'active:submitted:viva', set the expiration time in seconds.
     */
    /* eslint-disable prettier/prettier */
    switch (status.type) {
    case 'active:ongoing':
      expireHours = CASE_ONGOING_EXPIRATION_HOURS;
      break;
    case 'active:submitted:viva':
      expireHours = CASE_SUBMITTED_EXPIRATION_HOURS;
      break;
    }
    /* eslint-enable prettier/prettier */

    if (expireHours !== undefined) {
      const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));
      UpdateExpression.push('expirationTime = :newExpirationTime');
      ExpressionAttributeValues[':newExpirationTime'] = newExpirationTime;
    }

    UpdateExpression.push('#status = :newStatus');
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = status;
  }

  if (details) {
    UpdateExpression.push('details = :newDetails');
    ExpressionAttributeValues[':newDetails'] = details;
  }

  if (currentFormId) {
    const [queryFormError] = await to(queryFormsIfExistsFormId(currentFormId));
    if (queryFormError) {
      return response.failure(queryFormError);
    }

    UpdateExpression.push('currentFormId = :newCurrentFormId');
    ExpressionAttributeValues[':newCurrentFormId'] = currentFormId;
  }

  if (currentPosition || answers) {
    if (!currentFormId) {
      return response.failure(
        new BadRequestError(`currentFormId is needed when updating currentPosition and/or answers`)
      );
    }

    ExpressionAttributeNames['#formId'] = currentFormId;

    if (currentPosition) {
      UpdateExpression.push(`forms.#formId.currentPosition = :newCurrentPosition`);
      ExpressionAttributeValues[':newCurrentPosition'] = currentPosition;
    }

    if (answers) {
      UpdateExpression.push(`forms.#formId.answers = :newAnswers`);
      ExpressionAttributeValues[':newAnswers'] = answers;
    }
  }

  const { personalNumber } = decodeToken(event);

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: `USER#${personalNumber}`,
      SK: `USER#${personalNumber}#CASE#${id}`,
    },
    UpdateExpression: UpdateExpression.join(', '),
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [updateCaseError, updateCaseResponse] = await to(sendUpdateCaseRequest(params));
  if (updateCaseError) {
    return response.failure(updateCaseError);
  }

  const attributes = objectWithoutProperties(updateCaseResponse.Attributes, ['PK', 'SK']);
  return response.success(200, {
    type: 'updateCase',
    attributes: {
      ...attributes,
    },
  });
}

async function sendUpdateCaseRequest(params) {
  const [dynamoDbUpdateCallError, dynamoDbUpdateResult] = await to(dynamoDb.call('update', params));
  if (dynamoDbUpdateCallError) {
    throwError(dynamoDbUpdateCallError.statusCode, dynamoDbUpdateCallError.message);
  }

  return dynamoDbUpdateResult;
}

async function queryFormsIfExistsFormId(formId) {
  const dynamoDbQueryParams = {
    TableName: config.forms.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `FORM#${formId}` },
  };

  const [dynamoDbQueryCallError, dynamoDbQueryCallResult] = await to(
    dynamoDb.call('query', dynamoDbQueryParams)
  );
  if (dynamoDbQueryCallError) {
    throwError(dynamoDbQueryCallError.statusCode, dynamoDbQueryCallError.message);
  }

  if (dynamoDbQueryCallResult.Items.length === 0) {
    throwError(404, 'The requested form id does not exists');
  }

  return dynamoDbQueryCallResult;
}
