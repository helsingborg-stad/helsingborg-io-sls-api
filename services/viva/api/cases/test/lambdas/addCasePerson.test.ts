import type { Token } from '../../src/libs/token';
import type { LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';
import { addCasePerson } from '../../src/lambdas/addCasePerson';
import type { CaseItem } from '../../src/types/caseItem';

const personalNumber = '199801011212';
const SK = 'CASE#123';
const PK = `USER#${personalNumber}`;
const caseKeys = {
  PK,
  SK,
};

const caseItem: CaseItem = {
  PK,
  SK,
  id: '123',
  createdAt: 0,
  currentFormId: '123',
  details: {
    period: {
      startDate: 0,
      endDate: 0,
    },
    workflowId: '123',
  },
  state: 'SOME STATE',
  expirationTime: 0,
  updatedAt: 0,
  status: {
    type: '',
    name: '',
    description: '',
  },
  forms: null,
  provider: '',
  persons: [],
};

function createInput(partialInput: Partial<LambdaRequest> = {}): LambdaRequest {
  return {
    body: JSON.stringify({
      personalNumber,
    }),
    pathParameters: {
      id: '123',
    },
    headers: {
      Authorization: `Bearer ${personalNumber}`,
    },
    ...partialInput,
  };
}

function createDependencies(
  tokenToUse: Token,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    decodeToken: () => tokenToUse,
    updateCaseAddPerson: () => Promise.resolve({ Item: caseItem }),
    ...partialDependencies,
  };
}

it('successfully add person to case', async () => {
  const updateCaseAddPersonMock = jest.fn().mockResolvedValueOnce({ Item: caseItem });
  const input = createInput();
  const result = await addCasePerson(
    input,
    createDependencies({ personalNumber }, { updateCaseAddPerson: updateCaseAddPersonMock })
  );

  expect(updateCaseAddPersonMock).toHaveBeenCalledWith({
    caseKeys,
    personalNumber,
  });

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({
    jsonapi: {
      version: '1.0',
    },
    data: {
      type: 'addCasePerson',
      attributes: {
        caseItem: caseItem,
      },
    },
  });
});
