import { createRecurringCase } from '../../src/lambdas/createVivaCase';

import {
  CASE_PROVIDER_VIVA,
  VIVA_CASE_CREATED,
  NOT_STARTED,
} from '../../src/libs/constants';
import { getStatusByType } from '../../src/libs/caseStatuses';

import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

const user = {
  firstName: 'First',
  lastName: 'LastName',
  personalNumber: '199402011234',
};

const readParametersResponse = {
  recurringFormId: '1',
  randomCheckFormId: '2',
  completionFormId: '3',
};

const defaultFormProperties = {
  answers: [],
  currentPosition: DEFAULT_CURRENT_POSITION,
  encryption: {
    type: EncryptionType.Decrypted,
  },
};

const lambdaInput = {
  detail: {
    user,
  },
};

it('successfully creates a recurring application case', async () => {
  const expectedParameters = {
    PK: `USER#${user.personalNumber}`,
    currentFormId: readParametersResponse.recurringFormId,
    details: {
      period: {
        endDate: 0,
        startDate: 0,
      },
      workflowId: null,
      completions: null,
    },
    forms: {
      [readParametersResponse.recurringFormId]: defaultFormProperties,
      [readParametersResponse.randomCheckFormId]: defaultFormProperties,
      [readParametersResponse.completionFormId]: defaultFormProperties,
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
    status: getStatusByType(NOT_STARTED),
    updatedAt: 0,
  };

  const createCaseMock = jest.fn().mockResolvedValueOnce({ id: '123' });

  const result = await createRecurringCase(lambdaInput, {
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

it('stops execution when user case exists', async () => {
  const createCaseMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await createRecurringCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getTemplates: () => Promise.resolve({}),
    getUserCasesCount: () => Promise.resolve({ Count: 1 }),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledTimes(0);
});
