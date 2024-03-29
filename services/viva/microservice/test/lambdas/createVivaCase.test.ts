import _ from 'lodash';
import dayjs from 'dayjs';

import { getStatusByType } from '../../src/libs/caseStatuses';

import formRecurring from '../mock/formRecurring.json';
import { VivaPersonType } from '../../src/types/vivaMyPages';
import { createVivaCase } from '../../src/lambdas/createVivaCase';
import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';
import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';
import { CASE_PROVIDER_VIVA, VIVA_CASE_CREATED, NOT_STARTED_VIVA } from '../../src/libs/constants';

import type { PeriodConfig } from '../../src/helpers/vivaPeriod';
import type { VivaPersonsPerson } from '../../src/types/vivaMyPages';
import type {
  LambdaRequest,
  DynamoDbPutParams,
  Dependencies,
} from '../../src/lambdas/createVivaCase';
import type {
  CaseItem,
  CaseForm,
  CaseUser,
  CasePerson,
  CaseFormAnswer,
} from '../../src/types/caseItem';
import EkbCaseFactory from '../../src/helpers/case/EkbCaseFactory';

const MOCK_DATE = dayjs('2022-01-01T00:00:00Z');

const mockUuid = '00000000-0000-0000-0000-000000000000';
jest.mock('uuid', () => ({ v4: () => mockUuid }));

const user: CaseUser = {
  uuid: mockUuid,
  personalNumber: '199402011234',
  firstName: 'FirstName',
  lastName: 'LastName',
  civilStatus: null,
  mobilePhone: '0701234567',
  email: 'someMail@example.com',
  address: {
    city: 'KIRUNA',
    street: 'MANGIGATAN 2',
    postalCode: '98133',
  },
  createdAt: MOCK_DATE.unix(),
};

const partner: CasePerson = {
  personalNumber: '197601011234',
  firstName: 'PartnerFirstName',
  lastName: 'PartnerLastName',
  role: CasePersonRole.CoApplicant,
};

const children: CasePerson = {
  personalNumber: '200112011234',
  firstName: 'ChildrenFirstName',
  lastName: 'ChildrenLastName',
  role: CasePersonRole.Children,
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
  currentPosition: { ...DEFAULT_CURRENT_POSITION },
  encryption: {
    symmetricKeyName: mockUuid,
    encryptionKeyId: mockUuid,
    type: EncryptionType.Decrypted,
  },
};

const partnerFormProperties = {
  answers: [
    {
      field: {
        id: 'housingInfo.streetAddress',
        tags: [],
      },
      value: 'MANGIGATAN 2',
    },
    {
      field: {
        id: 'housingInfo.postalCode',
        tags: [],
      },
      value: '98133',
    },
    {
      field: {
        id: 'housingInfo.postalAddress',
        tags: [],
      },
      value: 'KIRUNA',
    },
  ],
  currentPosition: { ...DEFAULT_CURRENT_POSITION },
  encryption: {
    symmetricKeyName: mockUuid,
    encryptionKeyId: mockUuid,
    type: EncryptionType.Decrypted,
  },
};

const applicantFormProperties = {
  answers: [
    {
      field: {
        id: 'personalInfo.telephone',
        tags: ['phonenumber', 'applicant'],
      },
      value: '0701234567',
    },
    {
      field: {
        id: 'personalInfo.email',
        tags: ['email', 'applicant'],
      },
      value: 'someMail@example.com',
    },
    {
      field: {
        id: 'housingInfo.streetAddress',
        tags: [],
      },
      value: 'MANGIGATAN 2',
    },
    {
      field: {
        id: 'housingInfo.postalCode',
        tags: [],
      },
      value: '98133',
    },
    {
      field: {
        id: 'housingInfo.postalAddress',
        tags: [],
      },
      value: 'KIRUNA',
    },
  ],
  currentPosition: { ...DEFAULT_CURRENT_POSITION },
  encryption: {
    symmetricKeyName: mockUuid,
    encryptionKeyId: mockUuid,
    type: EncryptionType.Decrypted,
  },
};

function getMockPeriodConfig(openDateIso?: string): Promise<PeriodConfig> {
  return Promise.resolve({
    monthlyOpenDates: [openDateIso ?? '2022-01-01T12:00:00Z'],
    responseMessageFormat: '',
  });
}

function createLambdaInput(persons: VivaPersonsPerson | null = null): LambdaRequest {
  return {
    detail: {
      user,
      myPages: {
        idenclair: '01-2021-09-30/R37992',
        client: {
          pnumber: user.personalNumber,
          fname: user.firstName,
          lname: user.lastName,
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
  };
}

function createMockForm(answers: CaseFormAnswer[]): CaseForm {
  return {
    answers,
    currentPosition: { ...DEFAULT_CURRENT_POSITION },
    encryption: {
      symmetricKeyName: mockUuid,
      encryptionKeyId: mockUuid,
      type: EncryptionType.Decrypted,
    },
  };
}

function createMockCase(mockRecurringForm: CaseForm): CaseItem {
  return {
    id: mockUuid,
    PK: `USER#${user.personalNumber}`,
    SK: `CASE#${mockUuid}`,
    GSI2PK: 'CREATED#202201',
    currentFormId: readParametersResponse.recurringFormId,
    details: {
      vivaCaseId: 'R37992',
      period: {
        startDate: 1640995200000,
        endDate: 1643587200000,
      },
      workflowId: null,
      completions: null,
    },
    forms: {
      [readParametersResponse.recurringFormId]: mockRecurringForm,
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
    contacts: [],
    provider: CASE_PROVIDER_VIVA,
    state: VIVA_CASE_CREATED,
    status: getStatusByType(NOT_STARTED_VIVA),
    updatedAt: 0,
    createdAt: 1640995200000,
    expirationTime: 1641038400,
  };
}

const mockCaseFactory = new EkbCaseFactory({
  async getContacts() {
    return [];
  },
  async getRecurringFormId() {
    return readParametersResponse.recurringFormId;
  },
});

function createMockDependencies(value: Partial<Dependencies>): Dependencies {
  return _.merge(
    <Dependencies>{
      createCase: () => Promise.resolve(),
      getRecurringFormId: () => Promise.resolve(readParametersResponse.recurringFormId),
      getLastUpdatedCase: () => Promise.resolve(undefined),
      getCaseListByPeriod: () =>
        Promise.resolve({
          Items: [],
          Count: 0,
          ScannedCount: 1,
        }),
      getFormTemplates: () =>
        Promise.resolve({ [readParametersResponse.recurringFormId]: formRecurring }),
      createInitialForms: () =>
        Promise.resolve({
          [readParametersResponse.recurringFormId]: defaultFormProperties,
          [readParametersResponse.randomCheckFormId]: defaultFormProperties,
          [readParametersResponse.completionFormId]: defaultFormProperties,
        }),
      getPeriodConfig: getMockPeriodConfig,
      putSuccessEvent: () => Promise.resolve(),
      caseFactory: mockCaseFactory,
    },
    value
  );
}

describe('createVivaCase', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern').setSystemTime(MOCK_DATE.unix() * 1000);
  });

  it('successfully creates a recurring application case', async () => {
    const expectedParameters: DynamoDbPutParams = {
      TableName: 'cases',
      Item: {
        id: mockUuid,
        PK: `USER#${user.personalNumber}`,
        SK: `CASE#${mockUuid}`,
        GSI2PK: 'CREATED#202201',
        currentFormId: readParametersResponse.recurringFormId,
        details: {
          period: {
            startDate: 1640995200000,
            endDate: 1643587200000,
          },
          vivaCaseId: 'R37992',
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
        contacts: [],
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

    const result = await createVivaCase(
      lambdaInput,
      createMockDependencies({
        createCase: createCaseMock,
        getRecurringFormId: () => Promise.resolve(readParametersResponse.recurringFormId),
        getLastUpdatedCase: () => Promise.resolve(undefined),
        getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
        getFormTemplates: () => Promise.resolve({}),
        createInitialForms: () =>
          Promise.resolve({
            [readParametersResponse.recurringFormId]: defaultFormProperties,
            [readParametersResponse.randomCheckFormId]: defaultFormProperties,
            [readParametersResponse.completionFormId]: defaultFormProperties,
          }),
        getPeriodConfig: getMockPeriodConfig,
      })
    );

    expect(result).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith(expectedParameters);
  });

  it('successfully creates a recurring application case if user is approved to apply even if custom period is not open', async () => {
    const lambdaInput = createLambdaInput();
    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      lambdaInput,
      createMockDependencies({
        createCase: createCaseMock,
        getPeriodConfig: () => getMockPeriodConfig('2022-02-09T10:00:00Z'),
      })
    );

    expect(result).toBe(true);
  });

  it('successfully creates a prepopulated recurring application case', async () => {
    const expectedParameters: DynamoDbPutParams = {
      TableName: 'cases',
      Item: {
        id: mockUuid,
        PK: `USER#${user.personalNumber}`,
        SK: `CASE#${mockUuid}`,
        GSI2PK: 'CREATED#202201',
        currentFormId: readParametersResponse.recurringFormId,
        details: {
          vivaCaseId: 'R37992',
          period: {
            startDate: 1640995200000,
            endDate: 1643587200000,
          },
          workflowId: null,
          completions: null,
        },
        forms: {
          [readParametersResponse.recurringFormId]: applicantFormProperties,
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
        contacts: [],
        provider: CASE_PROVIDER_VIVA,
        state: VIVA_CASE_CREATED,
        status: getStatusByType(NOT_STARTED_VIVA),
        updatedAt: 0,
        createdAt: 1640995200000,
        expirationTime: 1641038400,
      },
    };

    const latestCaseItem = {
      ...expectedParameters.Item,
      forms: {
        [readParametersResponse.recurringFormId]: applicantFormProperties,
      },
    } as CaseItem;

    const lambdaInput = createLambdaInput();
    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      lambdaInput,
      createMockDependencies({
        createCase: createCaseMock,
        getRecurringFormId: () => Promise.resolve(readParametersResponse.recurringFormId),
        getLastUpdatedCase: () => Promise.resolve(latestCaseItem),
        getCaseListByPeriod: () =>
          Promise.resolve({
            Items: [],
            Count: 0,
            ScannedCount: 1,
          }),
        getFormTemplates: () =>
          Promise.resolve({ [readParametersResponse.recurringFormId]: formRecurring }),
        createInitialForms: () =>
          Promise.resolve({
            [readParametersResponse.recurringFormId]: defaultFormProperties,
            [readParametersResponse.randomCheckFormId]: defaultFormProperties,
            [readParametersResponse.completionFormId]: defaultFormProperties,
          }),
        getPeriodConfig: getMockPeriodConfig,
      })
    );

    expect(result).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith(expectedParameters);
  });

  it('prepopulates with previous case prioritized over user information', async () => {
    const latestCaseAnswers: CaseFormAnswer[] = [
      {
        field: {
          id: 'personalInfo.telephone',
          tags: ['phonenumber', 'applicant'],
        },
        value: '0767123456',
      },
      {
        field: {
          id: 'personalInfo.email',
          tags: ['email', 'applicant'],
        },
        value: 'case@example.com',
      },
    ];

    const latestCaseItem = createMockCase(createMockForm(latestCaseAnswers));

    const expectedAnswers: CaseFormAnswer[] = [
      ...latestCaseAnswers,
      {
        field: {
          id: 'housingInfo.streetAddress',
          tags: [],
        },
        value: 'MANGIGATAN 2',
      },
      {
        field: {
          id: 'housingInfo.postalCode',
          tags: [],
        },
        value: '98133',
      },
      {
        field: {
          id: 'housingInfo.postalAddress',
          tags: [],
        },
        value: 'KIRUNA',
      },
    ];

    const expectedCaseItem = createMockCase(createMockForm(expectedAnswers));

    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      createLambdaInput(),
      createMockDependencies({
        createCase: createCaseMock,
        getLastUpdatedCase: () => Promise.resolve(latestCaseItem),
      })
    );

    expect(result).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith({
      TableName: 'cases',
      Item: expectedCaseItem,
    });
  });

  it('successfully creates a recurring application case with partner', async () => {
    const expectedParameters: DynamoDbPutParams = {
      TableName: 'cases',
      Item: {
        id: mockUuid,
        PK: `USER#${user.personalNumber}`,
        SK: `CASE#${mockUuid}`,
        GSI1: `USER#${partner.personalNumber}`,
        GSI2PK: 'CREATED#202201',
        currentFormId: readParametersResponse.recurringFormId,
        details: {
          vivaCaseId: 'R37992',
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
            firstName: partner.firstName,
            lastName: partner.lastName,
            hasSigned: false,
            personalNumber: partner.personalNumber,
            role: CasePersonRole.CoApplicant,
          },
          {
            firstName: children.firstName,
            lastName: children.lastName,
            personalNumber: children.personalNumber,
            role: CasePersonRole.Children,
          },
        ],
        contacts: [],
        provider: CASE_PROVIDER_VIVA,
        state: VIVA_CASE_CREATED,
        status: getStatusByType(NOT_STARTED_VIVA),
        updatedAt: 0,
        createdAt: 1640995200000,
        expirationTime: 1641038400,
      },
    };

    const persons: VivaPersonsPerson = {
      person: [
        {
          pnumber: partner.personalNumber,
          fname: partner.firstName,
          lname: partner.lastName,
          type: VivaPersonType.Partner,
        },
        {
          pnumber: children.personalNumber,
          fname: children.firstName,
          lname: children.lastName,
          type: VivaPersonType.Child,
        },
      ],
    };

    const lambdaInput = createLambdaInput(persons);

    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      lambdaInput,
      createMockDependencies({
        createCase: createCaseMock,
        getRecurringFormId: () => Promise.resolve(readParametersResponse.recurringFormId),
        getLastUpdatedCase: () => Promise.resolve(undefined),
        getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 0, ScannedCount: 1 }),
        getFormTemplates: () =>
          Promise.resolve({
            [readParametersResponse.recurringFormId]: partnerFormProperties,
          }),
        createInitialForms: () =>
          Promise.resolve({
            [readParametersResponse.recurringFormId]: partnerFormProperties,
            [readParametersResponse.randomCheckFormId]: partnerFormProperties,
            [readParametersResponse.completionFormId]: partnerFormProperties,
          }),
        getPeriodConfig: getMockPeriodConfig,
      })
    );

    expect(result).toBe(true);
    expect(createCaseMock).toHaveBeenCalledWith(expectedParameters);
  });

  it('stops execution when case exists based on the same Viva application period', async () => {
    const lambdaInput = createLambdaInput();
    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      lambdaInput,
      createMockDependencies({
        createCase: createCaseMock,
        getRecurringFormId: () => Promise.resolve(readParametersResponse.recurringFormId),
        getLastUpdatedCase: () => Promise.resolve(undefined),
        getCaseListByPeriod: () => Promise.resolve({ Items: [], Count: 1, ScannedCount: 1 }),
        getFormTemplates: () => Promise.resolve({}),
        createInitialForms: () => Promise.resolve({}),
        getPeriodConfig: getMockPeriodConfig,
      })
    );

    expect(result).toBe(true);
    expect(createCaseMock).toHaveBeenCalledTimes(0);
  });

  it('does not creates a recurring application case if period is not open', async () => {
    const createCaseMock = jest.fn();

    const result = await createVivaCase(
      {
        detail: {
          user,
          myPages: {
            idenclair: '01-2021-09-30/R37992',
            client: {
              pnumber: user.personalNumber,
              fname: user.firstName,
              lname: user.lastName,
            },
            persons: null,
          },
          application: {
            period: {
              start: '2022-02-01',
              end: '2022-02-28',
            },
          },
        },
      },
      createMockDependencies({
        createCase: createCaseMock,
        getPeriodConfig: () => getMockPeriodConfig('2022-01-09T00:00:00Z'),
      })
    );

    expect(createCaseMock).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
