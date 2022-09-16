import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import { getUser } from '../src/lambdas/getUser';
import * as response from '../src/libs/response';

import type { LambdaRequest, Dependencies } from '../src/lambdas/getUser';

import type { CaseUser } from '../src/helpers/types';

const defaultPersonalNumber = '19900912345';
const defaultCaseUser = {
  personalNumber: defaultPersonalNumber,
} as CaseUser;

function createInput(): LambdaRequest {
  return {
    headers: {
      Authorization: 'authorization',
    },
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => ({
      personalNumber: defaultPersonalNumber,
    }),
    getUser: () => Promise.resolve({ Item: defaultCaseUser }),
    ...partialDependencies,
  };
}

function createHttpSuccessResponse(lambdaResponse: unknown) {
  return response.success(200, {
    type: 'getUser',
    attributes: {
      item: lambdaResponse,
    },
  });
}

function createHttpUserNotFoundResponse() {
  return response.failure(
    new ResourceNotFoundError('No user with provided personal number found in the users table')
  );
}

it('successfully fetches a user', async () => {
  const dependencies = createDependencies();
  const getUserSpy = jest.spyOn(dependencies, 'getUser');

  const result = await getUser(createInput(), dependencies);

  expect(getUserSpy).toHaveBeenCalledWith(defaultPersonalNumber);
  expect(result).toEqual(createHttpSuccessResponse(defaultCaseUser));
});

it('returns failure if no user is found', async () => {
  const getUserMock = jest.fn().mockResolvedValueOnce({});

  const result = await getUser(
    createInput(),
    createDependencies({
      getUser: getUserMock,
    })
  );

  expect(result).toEqual(createHttpUserNotFoundResponse());
});
