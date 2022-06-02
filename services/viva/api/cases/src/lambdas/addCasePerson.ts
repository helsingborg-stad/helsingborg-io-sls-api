// import to from 'await-to-js';
// import { BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../libs/config';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';
import { decodeToken, Token } from '../libs/token';
import log from '../libs/logs';

export interface LambdaRequest {
  body: {
    message: string;
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

interface HttpEvent {
  headers: {
    Authorization: string;
  };
}

interface UpdateCaseParameters {
  caseKeys: {
    PK: string;
    SK: string;
  };
  personalNumber: string;
}

export interface Dependencies {
  decodeToken: (params: HttpEvent) => Token;
  updateCaseAddPerson: (params: UpdateCaseParameters) => Promise<void>;
}

async function updateCaseAddPerson(params: UpdateCaseParameters): Promise<void> {
  const { caseKeys, personalNumber } = params;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression:
      'SET #persons = list_append(if_not_exists(#persons, :empty_list), :personalNumber)',
    ExpressionAttributeNames: {
      '#persons': 'persons',
    },
    ExpressionAttributeValues: {
      ':personalNumber': {
        L: [
          {
            S: personalNumber,
          },
        ],
      },
      ':empty_list': {
        L: [],
      },
    },
    ReturnValues: 'ALL_NEW',
  };

  await dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  console.log(dependencies);
  console.log(input);
  // const requestBody = JSON.parse(input.body);
  // const user = dependencies.decodeToken(input);

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseId: '123',
    },
  };

  return response.success(200, responseBody);
}

export const main = log.wrap(event => {
  return addCasePerson(event, {
    decodeToken,
    updateCaseAddPerson,
  });
});
