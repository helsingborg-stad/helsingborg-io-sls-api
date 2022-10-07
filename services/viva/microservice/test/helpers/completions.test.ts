import {
  // status type
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_SUBMITTED,

  // state
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
} from '../../src/libs/constants';

import completionsHelper from '../../src/helpers/completions';

import type { CaseCompletions, RequestedCaseCompletions } from '../../../types/caseItem';

interface CreateParams {
  requested?: RequestedCaseCompletions[];
  dueDate?: number;
  receivedDate?: number;
  isRandomCheck?: boolean;
  isAttachmentPending?: boolean;
  isCompleted?: boolean;
  isDueDateExpired?: boolean;
}

const completionsForms = {
  randomCheckFormId: '123ABC',
  completionFormId: '456CDF',
  newApplicationFormId: '789EFG',
  newApplicationCompletionFormId: '101HJK',
  newApplicationRandomCheckFormId: '112LMN',
};

const requestedAllFalseList: RequestedCaseCompletions[] = [
  {
    description: 'Underlag på alla sökta utgifter',
    received: false,
  },
  {
    description: 'Underlag på alla inkomster/tillgångar',
    received: false,
  },
  {
    description: 'Alla kontoutdrag för hela förra månaden och fram till idag',
    received: false,
  },
];

const requestedSomeTrueList: RequestedCaseCompletions[] = [
  {
    description: 'Underlag på alla sökta utgifter',
    received: false,
  },
  {
    description: 'Underlag på alla inkomster/tillgångar',
    received: true,
  },
  {
    description: 'Alla kontoutdrag för hela förra månaden och fram till idag',
    received: false,
  },
];

function createConditionOption(params: CreateParams = {}): CaseCompletions {
  return {
    requested: [...(params.requested ?? requestedAllFalseList)],
    description: 'Some description',
    receivedDate: null,
    dueDate: null,
    isCompleted: false,
    isDueDateExpired: false,
    isRandomCheck: false,
    isAttachmentPending: false,
    attachmentUploaded: [],
    ...params,
  } as CaseCompletions;
}

describe('Select form (getCompletionFormId)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
      }),
      expectedResult: completionsForms.randomCheckFormId,
      description: `isAttachmentPending is false, isRandomCheck is true, expect randomCheckFormId: ${completionsForms.randomCheckFormId}`,
    },
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: completionsForms.randomCheckFormId,
      description: `isAttachmentPending is true, isRandomCheck is true expect randomCheckFormId: ${completionsForms.randomCheckFormId}`,
    },
    {
      conditionOption: createConditionOption(),
      expectedResult: completionsForms.completionFormId,
      description: `isAttachmentPending is false, isRandomCheck is false, expect completionFormId: ${completionsForms.completionFormId}`,
    },
    {
      conditionOption: createConditionOption({
        isAttachmentPending: true,
      }),
      expectedResult: completionsForms.completionFormId,
      description: `isAttachmentPending is true, isRandomCheck is false, expect completionFormId: ${completionsForms.completionFormId}`,
    },
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
      }),
      expectedResult: completionsForms.completionFormId,
      description: `some requested is true, expect completionFormId: ${completionsForms.completionFormId}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const result = completionsHelper.get.formId(completionsForms, conditionOption);
    expect(result).toBe(expectedResult);
  });
});

describe('Recurring - Random select', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
      description: `yet to be submitted, expect ${ACTIVE_RANDOM_CHECK_REQUIRED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
      description: `submitted with attachments, expect ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
      description: `one or more requested received, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      isNewApplication: false,
      completions: conditionOption,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - None requested received', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
      description: `set status to ${ACTIVE_COMPLETION_SUBMITTED_VIVA} when attachment pending`,
    },
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
      description: `set status to ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA} when attachment pending and is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      isNewApplication: false,
      completions: conditionOption,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - Requested received', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
      description: `submitted with attachments, expect ${ACTIVE_COMPLETION_SUBMITTED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
      description: `completion requested, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      isNewApplication: false,
      completions: conditionOption,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - Completions completed', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
      },
      description: `set status to ${ACTIVE_SUBMITTED} if completed and requested is empty`,
    },
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
      },
      description: `set status to ${ACTIVE_SUBMITTED} if completed and some requested is true`,
    },
    {
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
      },
      description: `set status to ${ACTIVE_SUBMITTED} if completed and all requested is false`,
    },
    {
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
      },
      description: `set status to ${ACTIVE_SUBMITTED} if completed regardless of other completions attribute state`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      isNewApplication: false,
      completions: conditionOption,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('New Application', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
      description: `yet to be submitted, expect ${ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
      },
      description: `submitted with attachments, expect ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
      },
      description: `one or more requested received, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      isNewApplication: true,
      completions: conditionOption,
    });
    expect(results).toEqual(expectedResult);
  });
});
