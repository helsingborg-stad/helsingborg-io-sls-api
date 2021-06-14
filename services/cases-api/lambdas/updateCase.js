import to from 'await-to-js';
import {
  throwError,
  BadRequestError,
  ResourceNotFoundError,
} from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';
import { getStatusByType } from '../../../libs/caseStatuses';

import { getCaseWhereUserIsApplicant } from '../helpers/dynamo';
import { updateCaseValidationSchema } from '../helpers/schema';

export async function main(event) {
  const requestJsonBody = JSON.parse(event.body);
  const { id } = event.pathParameters;
  const { personalNumber } = decodeToken(event);

  if (!id) {
    return response.failure(new BadRequestError('Missing required path parameter "id"'));
  }

  const { error, value: validatedEventBody } = updateCaseValidationSchema.validate(
    requestJsonBody,
    {
      abortEarly: false,
    }
  );
  if (error) {
    return response.failure(new BadRequestError(error.message.replace(/"/g, "'")));
  }

  const { currentFormId, currentPosition, answers, signature } = validatedEventBody;

  const [getCaseError] = await to(getCaseWhereUserIsApplicant(id, personalNumber));
  if (getCaseError) {
    return response.failure(
      new ResourceNotFoundError('The user does not have any case with the provided case id')
    );
  }

  const newCaseStatus = getNewCaseStatus(answers, signature);

  // Create update expression
  const UpdateExpression = ['SET updatedAt = :newUpdatedAt'];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = { ':newUpdatedAt': Date.now() };

  if (newCaseStatus) {
    UpdateExpression.push('#status = :newStatus');
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = newCaseStatus;
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

  const caseKeys = {
    PK: `USER#${personalNumber}`,
    SK: `CASE#${id}`,
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

function getNewCaseStatus(answers, signature) {
  const statusChecks = [
    {
      name: 'active:ongoing',
      condition: isOngoing,
    },
    {
      name: 'active:signed',
      condition: isSignatureCompleted,
    },
    {
      name: 'active:submitted',
      condition: isSubmitted,
    },
  ];

  const statusType = statusChecks.reduce((acc, statusCheck) => {
    if (statusCheck.condition(answers, signature)) {
      return statusCheck.name;
    }
    return acc;
  }, undefined);

  return getStatusByType(statusType);
}

function isEncrypted(answers) {
  if (Array.isArray(answers)) {
    // decrypted answers should allways be submitted as an flat array,
    // if they are we assume the value to be decrypted and return false.
    return false;
  }
  const keys = Object.keys(answers);
  return keys.length === 1 && keys.includes('encryptedAnswers');
}

function isOngoing(answers) {
  return answers && isEncrypted(answers);
}

function isSignatureCompleted(answers, signature) {
  return signature.success && isEncrypted(answers);
}

function isSubmitted(answers, signature) {
  return signature.success && !isEncrypted(answers);
}
