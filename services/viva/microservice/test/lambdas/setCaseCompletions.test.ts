import { getStatusByType } from '../../src/libs/caseStatuses';
import { setCaseCompletions } from '../../src/lambdas/setCaseCompletions';
import type {
  Dependencies,
  LambdaRequest,
  LambdaDetail,
} from '../../src/lambdas/setCaseCompletions';

import {
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_SUBMITTED,
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
} from '../../src/libs/constants';

import { CasePersonRole } from '../../../types/caseItem';
import type { CaseItem, CaseCompletions } from '../../../types/caseItem';

const ssmParameters = {
  recurringFormId: 'recurringFormId',
  completionFormId: 'completionFormId',
  randomCheckFormId: 'randomCheckFormId',
  newApplicationFormId: 'newApplicationFormId',
  newApplicationRandomCheckFormId: 'newApplicationRandomCheckFormId',
  newApplicationCompletionFormId: 'newApplicationCompletionFormId',
};

const caseKeys = {
  PK: 'PK',
  SK: 'SK',
};

function createLambdaInput(partialDetail: Partial<LambdaDetail> = {}): LambdaRequest {
  return {
    detail: {
      caseKeys,
      caseStatusType: 'active:submitted',
      caseState: VIVA_APPLICATION_RECEIVED,
      ...partialDetail,
    },
  } as LambdaRequest;
}

function createCaseItem(
  partialCaseCompletions: Partial<CaseCompletions> = {},
  currentFormId: string = ssmParameters.recurringFormId
): CaseItem {
  return {
    persons: [
      {
        personalNumber: '123',
        firstName: 'firstName',
        lastName: 'lastName',
        role: CasePersonRole.Applicant,
        hasSigned: true,
      },
    ],
    currentFormId,
    details: {
      completions: partialCaseCompletions,
    },
  } as unknown as CaseItem;
}

test.each([
  {
    description: 'it updates a recurring case as submitted if completions is completed',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem({
      isCompleted: true,
      isRandomCheck: false,
      isAttachmentPending: false,
      isDueDateExpired: false,
    }),
    expectedResult: {
      statusType: ACTIVE_SUBMITTED,
      state: VIVA_APPLICATION_RECEIVED,
      formId: ssmParameters.recurringFormId,
    },
  },
  {
    description: 'it updates a recurring case for random check',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem({
      requested: [
        {
          description: 'lorem ipsum',
          received: false,
        },
      ],
      isCompleted: false,
      isRandomCheck: true,
      isAttachmentPending: false,
      isDueDateExpired: false,
    }),
    expectedResult: {
      statusType: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
      state: VIVA_RANDOM_CHECK_REQUIRED,
      formId: ssmParameters.randomCheckFormId,
    },
  },
  {
    description: 'it updates a recurring case for completions if NOT all requested received',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem({
      requested: [
        {
          description: 'Underlag på alla sökta utgifter',
          received: true,
        },
        {
          description: 'Konstig text med frågetecken?',
          received: false,
        },
      ],
      isCompleted: false,
      isRandomCheck: true,
      isAttachmentPending: false,
      isDueDateExpired: false,
    }),
    expectedResult: {
      statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
      state: VIVA_COMPLETION_REQUIRED,
      formId: ssmParameters.completionFormId,
    },
  },
  {
    description: 'it updates a recurring case for random check submitted if attachment is pending',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem({
      requested: [
        {
          description: 'Underlag på alla sökta utgifter',
          received: false,
        },
      ],
      isCompleted: false,
      isRandomCheck: true,
      isAttachmentPending: true,
      isDueDateExpired: false,
    }),
    expectedResult: {
      statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
      state: VIVA_RANDOM_CHECK_REQUIRED,
      formId: ssmParameters.randomCheckFormId,
    },
  },
  {
    description: 'it updates a recurring case for completions submitted if attachment is pending',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem({
      requested: [
        {
          description: 'Underlag på alla sökta utgifter',
          received: true,
        },
        {
          description: 'Konstig text med frågetecken?',
          received: false,
        },
      ],
      isCompleted: false,
      isRandomCheck: true,
      isAttachmentPending: true,
      isDueDateExpired: false,
    }),
    expectedResult: {
      statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
      state: VIVA_COMPLETION_REQUIRED,
      formId: ssmParameters.completionFormId,
    },
  },
  {
    description:
      'it updates a recurring case with incomming values from event if result is undefined',
    givenInput: createLambdaInput(),
    givenCaseItem: createCaseItem(),
    expectedResult: {
      statusType: 'active:submitted',
      state: VIVA_APPLICATION_RECEIVED,
      formId: ssmParameters.recurringFormId,
    },
  },
])('$description', async ({ givenInput, givenCaseItem, expectedResult }) => {
  const dependencies: Dependencies = {
    getCase: () => Promise.resolve(givenCaseItem),
    triggerSuccessEvent: () => Promise.resolve(),
    readParams: () => Promise.resolve(ssmParameters),
    updateCase: jest.fn(),
  };

  const result = await setCaseCompletions(givenInput, dependencies);

  expect(dependencies.updateCase).toHaveBeenCalledWith(
    caseKeys,
    expect.objectContaining({
      newStatus: getStatusByType(expectedResult?.statusType),
      newState: expectedResult?.state,
      newCurrentFormId: expectedResult?.formId,
      newPersons: [
        {
          personalNumber: '123',
          firstName: 'firstName',
          lastName: 'lastName',
          role: CasePersonRole.Applicant,
          hasSigned: false,
        },
      ],
    })
  );
  expect(result).toBe(true);
});
