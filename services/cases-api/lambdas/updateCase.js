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

import statusCheck from '../helpers/statusCheckCondition';
import { getUserCase } from '../helpers/dynamoDb';
import { updateCaseValidationSchema } from '../helpers/schema';

export async function main(event) {
  const requestJsonBody = JSON.parse(event.body);
  const { id } = event.pathParameters;
  const { personalNumber } = decodeToken(event);

  if (!id) {
    return response.failure(new BadRequestError('Missing required path parameter "id"'));
  }

  const { error, value: validatedJsonBody } = updateCaseValidationSchema.validate(requestJsonBody, {
    abortEarly: false,
  });
  if (error) {
    return response.failure(new BadRequestError(error.message.replace(/"/g, "'")));
  }

  const [getUserCaseError, userCase] = await to(getUserCase(personalNumber, id));
  if (getUserCaseError) {
    return response.failure(new InternalServerError(getUserCaseError));
  }

  if (!userCase) {
    return response.failure(new ResourceNotFoundError('Case not found'));
  }

  if (!Object.prototype.hasOwnProperty.call(userCase, 'persons')) {
    return response.failure(
      new InternalServerError(
        'Case attribute "persons" not found. The attribute "persons" is mandatory!'
      )
    );
  }

  const { currentFormId, currentPosition, answers, signature } = validatedJsonBody;

  const UpdateExpression = ['updatedAt = :newUpdatedAt'];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = { ':newUpdatedAt': Date.now() };

  const updatedPeopleSignature = updatePeopleSignature(personalNumber, userCase.persons, signature);
  const newCaseStatus = getNewCaseStatus({
    answers,
    people: updatedPeopleSignature,
  });
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
    return response.failure(new InternalServerError(updateCaseError));
  }

  const [putEventError] = await to(
    putEvent({ caseKeys }, 'casesApiUpdateCaseSuccess', 'casesApi.updateCase')
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

function getNewCaseStatus(conditionOption) {
  const statusCheckList = [
    {
      type: 'active:ongoing',
      conditionFunction: statusCheck.condition.isOngoing,
    },
    {
      type: 'active:signature:pending',
      conditionFunction: statusCheck.condition.isSignaturePending,
    },
    {
      type: 'active:signature:completed',
      conditionFunction: statusCheck.condition.isSignatureCompleted,
    },
    {
      type: 'active:submitted',
      conditionFunction: statusCheck.condition.isSubmitted,
    },
  ];

  const statusType = statusCheckList.reduce((type, statusCheckItem) => {
    if (statusCheckItem.conditionFunction(conditionOption)) {
      return statusCheckItem.type;
    }
    return type;
  }, undefined);

  return getStatusByType(statusType);
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
