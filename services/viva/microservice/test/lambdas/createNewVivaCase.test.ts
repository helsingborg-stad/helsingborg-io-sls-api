import { createNewVivaCase } from '../../src/lambdas/createNewVivaCase';

import { getStatusByType } from '../../src/libs/caseStatuses';
import {
  CLOSED,
  CASE_PROVIDER_VIVA,
  VIVA_CASE_CREATED,
  NEW_APPLICATION_VIVA,
  ACTIVE_ONGOING_NEW_APPLICATION,
} from '../../src/libs/constants';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';
import type { Dependencies } from '../../src/lambdas/createNewVivaCase';
import type { CaseForm, CaseItem } from '../../src/types/caseItem';

jest.useFakeTimers('modern').setSystemTime(new Date('2022-01-01'));

const mockUuid = '00000000-0000-0000-0000-000000000000';
jest.mock('uuid', () => ({ v4: () => mockUuid }));

const user = {
  firstName: 'FirstName',
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
    encryptionKeyId: mockUuid,
    type: EncryptionType.Decrypted,
  },
};

const lambdaInput = {
  detail: {
    user,
  },
};

function createDependencies(partialDependencies: Partial<Dependencies> = {}) {
  return {
    getTemplates: () => Promise.resolve({}),
    getFormTemplateId: () => Promise.resolve(readParametersResponse),
    getApplicantCases: () =>
      Promise.resolve([
        {
          status: { type: CLOSED },
          currentFormId: readParametersResponse.newApplicationFormId,
        },
      ] as CaseItem[]),
    getCoApplicantCases: () => Promise.resolve([] as CaseItem[]),
    createCase: () => Promise.resolve({ id: '123' }),
    isApprovedForNewApplication: () => Promise.resolve(true),
    ...partialDependencies,
  };
}

it('successfully creates a new application case', async () => {
  const expectedParameters = {
    PK: `USER#${user.personalNumber}`,
    currentFormId: readParametersResponse.newApplicationFormId,
    details: {
      period: {
        startDate: 1640995200000,
        endDate: 0,
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
        personalNumber: user.personalNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        hasSigned: false,
        role: CasePersonRole.Applicant,
      },
    ],
    provider: CASE_PROVIDER_VIVA,
    state: VIVA_CASE_CREATED,
    status: getStatusByType(NEW_APPLICATION_VIVA),
    updatedAt: 0,
  };

  const createCaseMock = jest.fn().mockResolvedValueOnce({ id: '123' });

  const result = await createNewVivaCase(
    lambdaInput,
    createDependencies({
      createCase: createCaseMock,
    })
  );

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledWith(
    expect.objectContaining({
      Item: expect.objectContaining(expectedParameters),
    })
  );
});

test.each([
  {
    description: 'stops execution when opened new applications only exists for applicant',
    getApplicantCasesResponse: [
      {
        status: { type: ACTIVE_ONGOING_NEW_APPLICATION },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
    getCoApplicantCasesResonse: [],
  },
  {
    description: 'stops execution when opened new applications only exists for coApplicant',
    getApplicantCasesResponse: [],
    getCoApplicantCasesResonse: [
      {
        status: { type: ACTIVE_ONGOING_NEW_APPLICATION },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
  },
  {
    description: 'stops execution when opened new applications exists for both applicants',
    getApplicantCasesResponse: [
      {
        status: { type: ACTIVE_ONGOING_NEW_APPLICATION },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
    getCoApplicantCasesResonse: [
      {
        status: { type: ACTIVE_ONGOING_NEW_APPLICATION },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
  },
])('$description', async ({ getApplicantCasesResponse, getCoApplicantCasesResonse }) => {
  const createCaseMock = jest.fn().mockResolvedValueOnce(undefined);
  const getApplicantCasesMock = jest.fn().mockResolvedValueOnce(getApplicantCasesResponse);
  const getCoApplicantCasesMock = jest.fn().mockResolvedValueOnce(getCoApplicantCasesResonse);

  const result = await createNewVivaCase(
    lambdaInput,
    createDependencies({
      createCase: createCaseMock,
      getApplicantCases: getApplicantCasesMock,
      getCoApplicantCases: getCoApplicantCasesMock,
    })
  );

  expect(result).toBe(false);
  expect(createCaseMock).toHaveBeenCalledTimes(0);
});

test.each([
  {
    description: 'creates new case when either applicants has any cases',
    getApplicantCasesResponse: [],
    getCoApplicantCasesResonse: [],
  },
  {
    description: 'creates new case when only applicant has closed new case',
    getApplicantCasesResponse: [
      {
        status: { type: CLOSED },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
    getCoApplicantCasesResonse: [],
  },
  {
    description: 'creates new case when only coApplicant has closed new case',
    getApplicantCasesResponse: [],
    getCoApplicantCasesResonse: [
      {
        status: { type: CLOSED },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
  },
  {
    description: 'creates new case when both applicants have closed new cases',
    getApplicantCasesResponse: [
      {
        status: { type: CLOSED },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
    getCoApplicantCasesResonse: [
      {
        status: { type: CLOSED },
        currentFormId: readParametersResponse.newApplicationFormId,
      },
    ],
  },
])('$description', async ({ getApplicantCasesResponse, getCoApplicantCasesResonse }) => {
  const createCaseMock = jest.fn().mockResolvedValueOnce(undefined);
  const getApplicantCasesMock = jest.fn().mockResolvedValueOnce(getApplicantCasesResponse);
  const getCoApplicantCasesMock = jest.fn().mockResolvedValueOnce(getCoApplicantCasesResonse);

  const result = await createNewVivaCase(
    lambdaInput,
    createDependencies({
      createCase: createCaseMock,
      getApplicantCases: getApplicantCasesMock,
      getCoApplicantCases: getCoApplicantCasesMock,
    })
  );

  expect(result).toBe(true);
  expect(createCaseMock).toHaveBeenCalledTimes(1);
});
