import to from 'await-to-js';
import { throwError, BadRequestError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';
import { getStatusByType } from '../../../libs/caseStatuses';

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

  if (provider) {
    UpdateExpression.push('provider = :newProvider');
    ExpressionAttributeValues[':newProvider'] = provider;
  }

  if (statusType) {
    const status = getStatusByType(statusType);
    if (!status) {
      return response.failure(new BadRequestError('invalid [statusType]'));
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
  const caseKeys = {
    PK: `USER#${personalNumber}`,
    SK: `USER#${personalNumber}#CASE#${id}`,
  };

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
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

  const [putEventError] = await to(
    putEvent({ caseKeys }, 'casesApiUpdateCaseSuccess', 'casesApi.updateCase')
  );
  if (putEventError) {
    throw putEventError;
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
