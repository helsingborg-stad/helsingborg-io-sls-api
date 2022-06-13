import { BadRequestError, ForbiddenError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../libs/config';
import log from '../libs/logs';
import { decodeToken, Token } from '../libs/token';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';

import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../helpers/constants';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import { CasePersonRole } from '../types/caseItem';
import type { CaseItem, CasePerson } from '../types/caseItem';

interface AddCasePersonRequest {
  personalNumber: string;
  firstName: string;
  lastName: string;
}

export interface LambdaRequest {
  body: string;
  pathParameters: {
    caseId: string;
  };
  headers: {
    Authorization: string;
  };
}

interface LambdaResponse {
  type: string;
  attributes: {
    caseItem: CaseItem;
  };
}

interface UpdateCaseAddPersonResponse {
  Attributes: CaseItem;
}

interface CaseKeys {
  PK: string;
  SK: string;
}

interface UpdateCaseParameters {
  caseKeys: CaseKeys;
  coApplicant: CasePerson;
}

export interface Dependencies {
  decodeToken: (params: LambdaRequest) => Token;
  updateCaseAddPerson: (params: UpdateCaseParameters) => Promise<UpdateCaseAddPersonResponse>;
  coApplicantStatus: (personalNumber: string) => Promise<unknown>;
  validateCoApplicantStatus: (statusList: unknown, requiredCodeList: unknown) => boolean;
}

function updateCaseAddPerson(params: UpdateCaseParameters): Promise<UpdateCaseAddPersonResponse> {
  const { caseKeys, coApplicant } = params;

  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression:
      'SET persons = list_append(persons, :personalNumber), GSI1 = :personalNumberGSI1',
    ExpressionAttributeValues: {
      ':personalNumber': [coApplicant],
      ':personalNumberGSI1': coApplicant.personalNumber,
    },
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  const {
    decodeToken,
    readParams,
    coApplicantStatus,
    validateCoApplicantStatus,
    updateCaseAddPerson,
  } = dependencies;

  const applicant = decodeToken(input);
  const coApplicantRequestBody = JSON.parse(input.body) as AddCasePersonRequest;

  if (applicant.personalNumber === coApplicantRequestBody.personalNumber) {
    const message = process.env.badRequestMessage ?? '';
    return response.failure(new BadRequestError(message));
  }

  const statusList = await coApplicantStatus(coApplicantRequestBody.personalNumber);
  const coApplicantAllowedStatusCode = [VIVA_STATUS_NEW_APPLICATION_OPEN];
  if (!validateCoApplicantStatus(statusList, coApplicantAllowedStatusCode)) {
    const message = process.env.forbiddenMessage ?? '';
    return response.failure(new ForbiddenError(message));
  }

  const caseKeys: CaseKeys = {
    PK: `USER#${applicant.personalNumber}`,
    SK: `CASE#${input.pathParameters.caseId}`,
  };

  const coApplicant: CasePerson = {
    personalNumber: coApplicantRequestBody.personalNumber,
    firstName: coApplicantRequestBody.firstName,
    lastName: coApplicantRequestBody.lastName,
    role: CasePersonRole.CoApplicant,
    hasSigned: false,
  };

  const updateCaseResult = await updateCaseAddPerson({
    caseKeys,
    coApplicant,
  });

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseItem: updateCaseResult.Attributes,
    },
  };

  return response.success(200, responseBody);
}

export const main = log.wrap(async event => {
  return addCasePerson(event, {
    decodeToken,
    updateCaseAddPerson,
    coApplicantStatus: vivaAdapter.application.status,
    validateCoApplicantStatus: validateApplicationStatus,
  });
});
