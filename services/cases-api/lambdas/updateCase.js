import to from 'await-to-js';
import {
  throwError,
  BadRequestError,
  ResourceNotFoundError,
  InternalServerError,
} from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { decodeToken } from '../../../libs/token';
import { objectWithoutProperties } from '../../../libs/objects';
import { getStatusByType } from '../../../libs/caseStatuses';

import geStatusTypeOnCondition from '../helpers/statusCheckCondition';
import { getUserCase } from '../helpers/dynamoDb';
import { updateCaseValidationSchema } from '../helpers/schema';
import log from '../../../libs/logs';

export async function main(event, context) {
  const requestJsonBody = JSON.parse(event.body);
  const { id } = event.pathParameters;
  const { personalNumber } = decodeToken(event);

  if (!id) {
    const errorMessage = 'Missing required path parameter "id"';
    log.error(errorMessage, context.awsRequestId, 'service-cases-api-updateCase-001');

    return response.failure(new BadRequestError(errorMessage));
  }

  const { error, value: validatedJsonBody } = updateCaseValidationSchema.validate(requestJsonBody, {
    abortEarly: false,
  });
  if (error) {
    log.error(
      error.message.replace(/"/g, "'"),
      context.awsRequestId,
      'service-cases-api-updateCase-002',
      error
    );

    return response.failure(new BadRequestError(error.message.replace(/"/g, "'")));
  }

  const [getUserCaseError, userCase] = await to(getUserCase(personalNumber, id));
  if (getUserCaseError) {
    log.error(
      'Get User case error',
      context.awsRequestId,
      'service-cases-api-updateCase-003',
      getUserCaseError
    );

    return response.failure(new InternalServerError(getUserCaseError));
  }

  if (!userCase) {
    const errorMessage = 'Case not found';
    log.error(errorMessage, context.awsRequestId, 'service-cases-api-updateCase-004');

    return response.failure(new ResourceNotFoundError(errorMessage));
  }

  if (!Object.prototype.hasOwnProperty.call(userCase, 'persons')) {
    const errorMessage =
      'Case attribute "persons" not found. The attribute "persons" is mandatory!';
    log.error(errorMessage, context.awsRequestId, 'service-cases-api-updateCase-005');

    return response.failure(new InternalServerError(errorMessage));
  }

  const { currentFormId, currentPosition, answers, signature, encryption } = validatedJsonBody;

  const UpdateExpression = ['updatedAt = :newUpdatedAt'];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = { ':newUpdatedAt': Date.now() };

  const updatedPeopleSignature = updatePeopleSignature(personalNumber, userCase.persons, signature);
  const newCaseStatusType = geStatusTypeOnCondition({
    answers,
    people: updatedPeopleSignature,
    state: userCase.state,
  });
  const newCaseStatus = getStatusByType(newCaseStatusType);
  if (newCaseStatus) {
    UpdateExpression.push('#status = :newStatus');
    ExpressionAttributeNames['#status'] = 'status';
    ExpressionAttributeValues[':newStatus'] = newCaseStatus;
  }

  if (currentFormId) {
    const [queryFormError] = await to(queryFormsIfExistsFormId(currentFormId));
    if (queryFormError) {
      log.error(
        'Query form error',
        context.awsRequestId,
        'service-cases-api-updateCase-006',
        queryFormError
      );

      return response.failure(queryFormError);
    }

    UpdateExpression.push('currentFormId = :newCurrentFormId');
    ExpressionAttributeValues[':newCurrentFormId'] = currentFormId;
  }

  ExpressionAttributeNames['#formId'] = currentFormId;

  if (currentPosition || answers) {
    if (!currentFormId) {
      const errorMessage = 'currentFormId is needed when updating currentPosition and/or answers';
      log.error(errorMessage, context.awsRequestId, 'service-cases-api-updateCase-007');

      return response.failure(new BadRequestError(errorMessage));
    }

    if (currentPosition) {
      UpdateExpression.push(`forms.#formId.currentPosition = :newCurrentPosition`);
      ExpressionAttributeValues[':newCurrentPosition'] = currentPosition;
    }

    if (answers) {
      UpdateExpression.push(`forms.#formId.answers = :newAnswers`);
      ExpressionAttributeValues[':newAnswers'] = answers;
    }
  }

  if (encryption) {
    UpdateExpression.push(`forms.#formId.encryption = :newEncryption`);
    ExpressionAttributeValues[':newEncryption'] = encryption;
  }

  UpdateExpression.push('persons = :newPersons');
  ExpressionAttributeValues[':newPersons'] = Object.assign(
    [],
    userCase.persons,
    updatedPeopleSignature
  );

  const caseKeys = {
    PK: userCase.PK,
    SK: userCase.SK,
  };

  const updateCaseParams = {
    TableName: config.cases.tableName,
    Key: caseKeys,
    UpdateExpression: `SET ${UpdateExpression.join(', ')}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const [updateCaseError, updateCaseResponse] = await to(sendUpdateCaseRequest(updateCaseParams));
  if (updateCaseError) {
    log.error(
      'Update case error',
      context.awsRequestId,
      'service-cases-api-updateCase-008',
      updateCaseError
    );

    return response.failure(new InternalServerError(updateCaseError));
  }

  const [putEventError] = await to(
    putEvent(
      { caseKeys, status: newCaseStatus, state: userCase.state },
      'casesApiUpdateCaseSuccess',
      'casesApi.updateCase'
    )
  );
  if (putEventError) {
    throw putEventError;
  }

  const attributes = objectWithoutProperties(updateCaseResponse.Attributes, ['PK', 'SK', 'GSI1']);
  return response.success(200, {
    type: 'updateCase',
    attributes,
  });
}

async function sendUpdateCaseRequest(params) {
  const [dynamoDbUpdateCallError, dynamoDbUpdateResult] = await to(dynamoDb.call('update', params));
  if (dynamoDbUpdateCallError) {
    throw dynamoDbUpdateCallError;
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

function updatePeopleSignature(matchPersonalNumber, people, signature) {
  if (!people) {
    return [];
  }

  return people.map(person => {
    const newPerson = { ...person };

    if (newPerson.personalNumber === matchPersonalNumber && signature) {
      newPerson.hasSigned = signature.success;
    }

    return newPerson;
  });
}
