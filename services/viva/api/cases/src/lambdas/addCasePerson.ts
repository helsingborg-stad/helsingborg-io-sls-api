// import to from 'await-to-js';
// import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../libs/config';
import log from '../libs/logs';
import { decodeToken, Token } from '../libs/token';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';

import { CasePersonRole } from '../types/caseItem';
import type { CaseItem, CasePerson } from '../types/caseItem';

interface AddCasePersonRequest {
  personalNumber: string;
}

export interface LambdaRequest {
  body: string;
  pathParameters: {
    id: string;
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
  Item: CaseItem;
}

interface UpdateCaseParameters {
  caseKeys: {
    PK: string;
    SK: string;
  };
  personalNumber: string;
}

export interface Dependencies {
  decodeToken: (params: LambdaRequest) => Token;
  updateCaseAddPerson: (params: UpdateCaseParameters) => Promise<UpdateCaseAddPersonResponse>;
}

function updateCaseAddPerson(params: UpdateCaseParameters): Promise<UpdateCaseAddPersonResponse> {
  const { caseKeys, personalNumber } = params;
  const coApplicant: CasePerson = {
    personalNumber,
    firstName: 'Some first name',
    lastName: 'Some last name',
    role: CasePersonRole.CoApplicant,
    hasSigned: false,
  };

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
      ':personalNumberGSI1': personalNumber,
    },
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  const decodedToken = dependencies.decodeToken(input);
  const requestBody = JSON.parse(input.body) as AddCasePersonRequest;
  const { id: caseId } = input.pathParameters;

  const caseKeys = {
    PK: `USER#${decodedToken.personalNumber}`,
    SK: `CASE#${caseId}`,
  };

  const updateCaseResult = await dependencies.updateCaseAddPerson({
    caseKeys,
    personalNumber: requestBody.personalNumber,
  });

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseItem: updateCaseResult.Item,
    },
  };

  return response.success(200, responseBody);
}

export const main = log.wrap(async event => {
  return addCasePerson(event, {
    decodeToken,
    updateCaseAddPerson,
  });
});
