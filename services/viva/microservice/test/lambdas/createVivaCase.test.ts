import { CASE_PROVIDER_VIVA, VIVA_CASE_CREATED, NOT_STARTED_VIVA } from '../../src/libs/constants';
import { getStatusByType } from '../../src/libs/caseStatuses';

import { createVivaCase, LambdaRequest, DynamoDbPutParams } from '../../src/lambdas/createVivaCase';
import { EncryptionType, CasePersonRole, CaseForm } from '../../src/types/caseItem';
import { VivaPersonsPerson, VivaPersonType } from '../../src/types/vivaMyPages';
import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

jest.useFakeTimers('modern').setSystemTime(1640995200000);

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

const partnerFormProperties = {
  answers: [],
  currentPosition: DEFAULT_CURRENT_POSITION,
  encryption: {
    type: EncryptionType.Decrypted,
    symmetricKeyName: mockUuid,
  },
};

function createLambdaInput(persons: VivaPersonsPerson | null = null): LambdaRequest {
  return {
    detail: {
      clientUser: user,
      vivaPersonDetail: {
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
          persons,
        },
        application: {
          period: {
            start: '2022-01-01',
            end: '2022-01-31',
          },
        },
      },
    },
  };
}

it('successfully creates a recurring application case', async () => {
  const expectedParameters = {
    TableName: 'cases',
    Item: {
      id: mockUuid,
      PK: `USER#${user.personalNumber}`,
      SK: `CASE#${mockUuid}`,
      currentFormId: readParametersResponse.recurringFormId,
      details: {
        period: {
          startDate: 1640995200000,
          endDate: 1643587200000,
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
          lastName: user.lastName,
          hasSigned: false,
          personalNumber: user.personalNumber,
          role: CasePersonRole.Applicant,
        },
      ],
      provider: CASE_PROVIDER_VIVA,
      state: VIVA_CASE_CREATED,
      status: getStatusByType(NOT_STARTED_VIVA),
      updatedAt: 0,
      createdAt: 1640995200000,
      expirationTime: 1641038400,
    },
  };

  const lambdaInput = createLambdaInput();
  const createCaseMock = jest.fn();

  const result = await createVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getLastUpdatedCase: () => Promise.resolve(undefined),
    getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
    getFormTemplates: () => Promise.resolve({}),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledWith(expectedParameters);
});

it('successfully creates a recurring application case with partner', async () => {
  const expectedParameters: DynamoDbPutParams = {
    TableName: 'cases',
    Item: {
      id: mockUuid,
      PK: `USER#${user.personalNumber}`,
      SK: `CASE#${mockUuid}`,
      GSI1: `USER#${user.personalNumber}`,
      currentFormId: readParametersResponse.recurringFormId,
      details: {
        period: {
          startDate: 1640995200000,
          endDate: 1643587200000,
        },
        workflowId: null,
        completions: null,
      },
      forms: {
        [readParametersResponse.recurringFormId]: partnerFormProperties,
        [readParametersResponse.randomCheckFormId]: partnerFormProperties,
        [readParametersResponse.completionFormId]: partnerFormProperties,
      },
      persons: [
        {
          firstName: user.firstName,
          lastName: user.lastName,
          hasSigned: false,
          personalNumber: user.personalNumber,
          role: CasePersonRole.Applicant,
        },
        {
          firstName: user.firstName,
          lastName: user.lastName,
          hasSigned: false,
          personalNumber: user.personalNumber,
          role: CasePersonRole.CoApplicant,
        },
      ],
      provider: CASE_PROVIDER_VIVA,
      state: VIVA_CASE_CREATED,
      status: getStatusByType(NOT_STARTED_VIVA),
      updatedAt: 0,
      createdAt: 1640995200000,
      expirationTime: 1641038400,
    },
  };

  const persons: VivaPersonsPerson = {
    person: {
      pnumber: user.personalNumber,
      fname: user.firstName,
      lname: user.lastName,
      type: VivaPersonType.Partner,
    },
  };
  const lambdaInput = createLambdaInput(persons);

  const createCaseMock = jest.fn();

  const result = await createVivaCase(lambdaInput, {
    createCase: createCaseMock,
    readParams: () => Promise.resolve(readParametersResponse),
    getLastUpdatedCase: () => Promise.resolve(undefined),
    getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
    getFormTemplates: () => Promise.resolve({}),
  });

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledWith(expectedParameters);
});

it('stops execution when case exists based on the same Viva application period', async () => {
  const lambdaInput = createLambdaInput();
  const createCaseMock = jest.fn();

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
