import { CASE_PROVIDER_VIVA, VIVA_CASE_CREATED, NOT_STARTED } from '../../src/libs/constants';
import { getStatusByType } from '../../src/libs/caseStatuses';

import { createVivaCase } from '../../src/lambdas/createVivaCase';
import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';
import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

const user = {
  firstName: 'First',
  lastName: 'LastName',
  personalNumber: '199402011234',
};

const vivaPerson = {
  case: {
    client: {
      pnumber: '19940201-1234',
      fname: 'First',
      lname: 'LastName',
    },
    officers: {
      officer: {
        name: 'officerName',
        type: 'officerType',
        typeenclair: 'officerTypeenclair',
        phone: null,
        mail: 'some@mail.com',
        title: 'someTitle',
      },
    },
    persons: null,
  },
  application: {
    period: {
      start: '1',
      end: '2',
    },
  },
};

const readParametersResponse = {
  recurringFormId: '1',
  randomCheckFormId: '2',
  completionFormId: '3',
  newApplicationFormId: '4',
  newApplicationRandomCheckFormId: '5',
  newApplicationCompletionFormId: '6',
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
    clientUser: user,
    vivaPersonDetail: vivaPerson,
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

  const createCaseMock = jest.fn();

  const result = await createVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getLastUpdatedCase: () => Promise.resolve(undefined),
    getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
    getFormTemplates: () => Promise.resolve({}),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledTimes(1);
});

it('successfully creates a recurring application case with partner', async () => {
  const expectedParameters = {
    PK: `USER#${user.personalNumber}`,
    GSI1: `USER#${user.personalNumber}`,
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
      {
        firstName: user.firstName,
        hasSigned: false,
        lastName: user.lastName,
        personalNumber: user.personalNumber,
        role: CasePersonRole.CoApplicant,
      },
    ],
    provider: CASE_PROVIDER_VIVA,
    state: VIVA_CASE_CREATED,
    status: getStatusByType(NOT_STARTED),
    updatedAt: 0,
  };

  const createCaseMock = jest.fn();

  const result = await createVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getLastUpdatedCase: () => Promise.resolve(undefined),
    getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
    getFormTemplates: () => Promise.resolve({}),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledWith(expect.objectContaining(expectedParameters));
});

it('stops execution when user case exists', async () => {
  const createCaseMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await createVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getLastUpdatedCase: () => Promise.resolve(undefined),
    getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 1, ScannedCount: 1 }),
    getFormTemplates: () => Promise.resolve({}),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledTimes(0);
});
