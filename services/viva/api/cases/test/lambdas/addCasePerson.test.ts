import type { Token } from '../../src/libs/token';
import type { LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';
import { addCasePerson } from '../../src/lambdas/addCasePerson';
import { CasePersonRole } from '../../src/types/caseItem';
import type { CaseItem } from '../../src/types/caseItem';

const personalNumber = '199801011212';
const SK = 'CASE#123';
const PK = `USER#${personalNumber}`;
const caseKeys = {
  PK,
  SK,
};

const coApplicant = {
  personalNumber: '199701031212',
  firstName: 'Svenne',
  lastName: 'Banan',
  hasSigned: false,
  role: CasePersonRole.CoApplicant,
};

const caseItem: CaseItem = {
  PK,
  SK,
  id: 'CASE#123',
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
  persons: [coApplicant],
};

function createInput(partialInput: Partial<LambdaRequest> = {}): LambdaRequest {
  return {
    body: JSON.stringify({
      personalNumber: '199701031212',
      firstName: 'Svenne',
      lastName: 'Banan',
    }),
    pathParameters: {
      caseId: '123',
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
    updateCaseAddPerson: () => Promise.resolve({ Attributes: caseItem }),
    coApplicantStatus: () =>
      Promise.resolve([
        {
          code: 1,
          description: 'You can apply',
        },
      ]),
    validateCoApplicantStatus: () => true,
    getUserCasesCount: () => Promise.resolve({ Count: 1 }),
    ...partialDependencies,
  };
}

it('successfully add person to case', async () => {
  const updateCaseAddPersonMock = jest.fn().mockResolvedValueOnce({ Attributes: caseItem });
  const input = createInput();
  const dependencies = createDependencies(
    { personalNumber },
    { updateCaseAddPerson: updateCaseAddPersonMock }
  );
  const result = await addCasePerson(input, dependencies);

  expect(updateCaseAddPersonMock).toHaveBeenCalledWith({
    caseKeys,
    coApplicant,
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
