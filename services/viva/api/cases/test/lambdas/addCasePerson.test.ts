import type { Token } from '../../src/libs/token';
import { addCasePerson } from '../../src/lambdas/addCasePerson';
import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';
import { CasePersonRole, EncryptionType } from '../../src/types/caseItem';
import type { CaseItem, CaseForm, CasePerson } from '../../src/types/caseItem';
import type { LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';

import { objectWithoutProperties } from '../../../../libs/objects';

const personalNumber = '199801011212';
const SK = 'CASE#123';
const PK = `USER#${personalNumber}`;
const caseKeys = { PK, SK };

const mockToken: Token = {
  personalNumber,
};

const coApplicant: CasePerson = {
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
  currentPosition: DEFAULT_CURRENT_POSITION,
  encryption: {
    symmetricKeyName: '00000000-0000-0000-0000-000000000000',
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
    vivaCaseId: '123',
    period: {
      startDate: 0,
      endDate: 0,
    },
    workflowId: '123',
    completions: null,
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

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    decodeToken: () => mockToken,
    updateCase: () => Promise.resolve({ Attributes: caseItem }),
    getFormTemplates: () => Promise.resolve(),
    coApplicantStatus: () => Promise.resolve([]),
    validateCoApplicantStatus: () => true,
    getCase: () => Promise.resolve(caseItem),
    populateForm: () => ({}),
    ...partialDependencies,
  };
}

it('successfully add person to case', async () => {
  const updateCaseMock = jest.fn().mockResolvedValueOnce({ Attributes: { ...caseItem } });
  const getFormTemplatesMock = jest.fn().mockResolvedValueOnce({});
  const caseWithRemovedProperties = objectWithoutProperties(caseItem, ['PK', 'SK', 'GSI1']);

  const input = createInput();
  const dependencies = createDependencies({
    updateCase: updateCaseMock,
    getFormTemplates: getFormTemplatesMock,
  });
  const result = await addCasePerson(input, dependencies);

  expect(getFormTemplatesMock).toHaveBeenCalledWith(['123abc']);
  expect(updateCaseMock).toHaveBeenCalledWith({
    caseKeys,
    coApplicant,
    form: {},
  });

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({
    jsonapi: {
      version: '1.0',
    },
    data: {
      type: 'addCasePerson',
      attributes: {
        caseItem: caseWithRemovedProperties,
      },
    },
  });
});

it('return BadRequestError if co-applicant is the same person', async () => {
  const input = createInput({
    body: JSON.stringify({
      personalNumber,
      firstName: 'Olle',
      lastName: 'Cola',
    }),
  });
  const dependencies = createDependencies();
  const result = await addCasePerson(input, dependencies);

  expect(result.statusCode).toBe(400);
});

it('return ForbiddenError if status code is not allowed', async () => {
  const input = createInput();
  const dependencies = createDependencies({
    validateCoApplicantStatus: () => false,
  });
  const result = await addCasePerson(input, dependencies);

  expect(result.statusCode).toBe(403);
});
