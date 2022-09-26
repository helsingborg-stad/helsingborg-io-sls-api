import { createNewVivaCase } from '../../src/lambdas/createNewVivaCase';

import {
  CASE_PROVIDER_VIVA,
  VIVA_CASE_CREATED,
  NEW_APPLICATION_VIVA,
} from '../../src/libs/constants';
import { getStatusByType } from '../../src/libs/caseStatuses';

import { EncryptionType, CasePersonRole, CaseForm } from '../../src/types/caseItem';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

const mockUuid = '00000000-0000-0000-0000-000000000000';
jest.mock('uuid', () => ({ v4: () => mockUuid }));

const user = {
  firstName: 'First',
  lastName: 'LastName',
  personalNumber: '199402011234',
};

const readParametersResponse = {
  recurringFormId: '1',
  randomCheckFormId: '2',
  completionFormId: '3',
  newApplicationFormId: '4',
  newApplicationRandomCheckFormId: '5',
  newApplicationCompletionFormId: '6',
};

const defaultFormProperties: CaseForm = {
  answers: [],
  currentPosition: DEFAULT_CURRENT_POSITION,
  encryption: {
    symmetricKeyName: mockUuid,
    type: EncryptionType.Decrypted,
  },
};

const lambdaInput = {
  detail: {
    user,
  },
};

it('successfully creates a new application case', async () => {
  const expectedParameters = {
    PK: `USER#${user.personalNumber}`,
    currentFormId: readParametersResponse.newApplicationFormId,
    details: {
      period: {
        endDate: 0,
        startDate: 0,
      },
      workflowId: null,
      completions: null,
    },
    forms: {
      [readParametersResponse.newApplicationFormId]: defaultFormProperties,
      [readParametersResponse.newApplicationCompletionFormId]: defaultFormProperties,
      [readParametersResponse.newApplicationRandomCheckFormId]: defaultFormProperties,
    },
    persons: [
      {
        firstName: user.firstName,
        hasSigned: false,
        lastName: user.lastName,
        personalNumber: user.personalNumber,
        role: CasePersonRole.Applicant,
      },
    ],
    provider: CASE_PROVIDER_VIVA,
    state: VIVA_CASE_CREATED,
    status: getStatusByType(NEW_APPLICATION_VIVA),
    updatedAt: 0,
  };

  const createCaseMock = jest.fn().mockResolvedValueOnce({ id: '123' });

  const result = await createNewVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getTemplates: () => Promise.resolve({}),
    getUserCasesCount: () => Promise.resolve({ Count: 0 }),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledWith(
    expect.objectContaining({
      Item: expect.objectContaining(expectedParameters),
    })
  );
});

it('stops execution when user cases exists', async () => {
  const createCaseMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await createNewVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getTemplates: () => Promise.resolve({}),
    getUserCasesCount: () => Promise.resolve({ Count: 1 }),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledTimes(0);
});
