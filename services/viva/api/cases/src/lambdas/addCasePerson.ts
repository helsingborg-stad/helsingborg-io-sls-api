// import to from 'await-to-js';
// import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../libs/config';
import log from '../libs/logs';
import { decodeToken, Token } from '../libs/token';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';

import type { CaseItem } from '../types/caseItem';

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
    caseId: string;
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
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression:
      'SET #persons = list_append(if_not_exists(#persons, :checkPerson), :personalNumber)',
    ExpressionAttributeNames: {
      '#persons': 'persons',
    },
    ExpressionAttributeValues: {
      ':personalNumber': {
        L: [{ S: personalNumber }],
      },
      ':checkPerson': {
        L: [{ S: personalNumber }],
      },
    },
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  const decodedToken = dependencies.decodeToken(input);
  console.log('decodedToken:', decodedToken);

  const { id } = input.pathParameters;
  console.log('pathParameters id:', id);

  const requestBody = JSON.parse(input.body) as AddCasePersonRequest;
  console.log('requestBody:', requestBody);

  const personalNumber = '199801011212';
  const caseKeys = {
    PK: `USER#${personalNumber}`,
    SK: 'CASE#123',
  };

  const updateCaseResult = await dependencies.updateCaseAddPerson({ caseKeys, personalNumber });
  console.log('updateCaseResult:', updateCaseResult);

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseId: updateCaseResult.Item.id,
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
