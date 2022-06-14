import type { Token } from '../../src/libs/token';
import { addCasePerson } from '../../src/lambdas/addCasePerson';
import { CasePersonRole, EncryptionType } from '../../src/types/caseItem';
import type { CaseItem, CaseForm } from '../../src/types/caseItem';
import type { LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';

const personalNumber = '199801011212';
const SK = 'CASE#123';
const PK = `USER#${personalNumber}`;
const caseKeys = { PK, SK };

const coApplicant = {
  personalNumber: '199701031212',
  firstName: 'Svenne',
  lastName: 'Banan',
  hasSigned: false,
  role: CasePersonRole.CoApplicant,
};

const form: CaseForm = {
  answers: [
    {
      field: {
        id: 'some id 123',
        tags: [],
      },
      value: 'Some value abc',
    },
  ],
  currentPosition: {
    currentMainStep: 0,
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
  },
  encryption: {
    type: EncryptionType.Decrypted,
  },
};

const caseItem: CaseItem = {
  PK,
  SK,
  id: '123',
  createdAt: 0,
  currentFormId: '123abc',
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
  forms: {
    '123abc': form,
  },
  provider: 'VIVA',
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
  caseItemToUse: CaseItem,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    decodeToken: () => tokenToUse,
    updateCase: () => Promise.resolve({ Attributes: caseItemToUse }),
    getFormTemplates: () => Promise.resolve(),
    coApplicantStatus: () => Promise.resolve(),
    validateCoApplicantStatus: () => true,
    getCase: () => Promise.resolve(caseItemToUse),
    populateForm: () => ({}),
    ...partialDependencies,
  };
}

it('successfully add person to case', async () => {
  const updateCaseMock = jest.fn().mockResolvedValueOnce({ Attributes: caseItem });
  const input = createInput();
  const dependencies = createDependencies(
    { personalNumber },
    { ...caseItem },
    { updateCase: updateCaseMock }
  );
  const result = await addCasePerson(input, dependencies);

  expect(updateCaseMock).toHaveBeenCalledWith({
    caseKeys,
    coApplicant,
    form: { '123abc': form },
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
