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

const ssmParameters = {
  recurringFormId: 'recurringFormId',
  completionFormId: 'completionFormId',
  randomCheckFormId: 'randomCheckFormId',
  newApplicationFormId: 'newApplicationFormId',
  newApplicationRandomCheckFormId: 'newApplicationRandomCheckFormId',
  newApplicationCompletionFormId: 'newApplicationCompletionFormId',
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

function createConditionOption(params: Partial<CreateParams> = {}): CaseCompletions {
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
  };
}

describe('Recurring - Random select', () => {
  test.each([
    {
      description: `yet to be submitted, expect ${ACTIVE_RANDOM_CHECK_REQUIRED_VIVA}`,
      conditionOption: createConditionOption({
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
        formId: ssmParameters.randomCheckFormId,
      },
    },
    {
      description: `submitted with attachments, expect ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA}`,
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
        formId: ssmParameters.randomCheckFormId,
      },
    },
    {
      description: `one or more requested received, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isRandomCheck: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: ssmParameters.completionFormId,
      },
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      completions: conditionOption,
      forms: ssmParameters,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - None requested received', () => {
  test.each([
    {
      description: `set status to ${ACTIVE_COMPLETION_SUBMITTED_VIVA} when attachment pending`,
      conditionOption: createConditionOption({
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: ssmParameters.completionFormId,
      },
    },
    {
      description: `set status to ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA} when attachment pending and is random check`,
      conditionOption: createConditionOption({
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
        state: VIVA_RANDOM_CHECK_REQUIRED,
        formId: ssmParameters.randomCheckFormId,
      },
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      completions: conditionOption,
      forms: ssmParameters,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - Requested received', () => {
  test.each([
    {
      description: `submitted with attachments, expect ${ACTIVE_COMPLETION_SUBMITTED_VIVA}`,
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isAttachmentPending: true,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_SUBMITTED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: ssmParameters.completionFormId,
      },
    },
    {
      description: `completion requested, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
      }),
      expectedResult: {
        statusType: ACTIVE_COMPLETION_REQUIRED_VIVA,
        state: VIVA_COMPLETION_REQUIRED,
        formId: ssmParameters.completionFormId,
      },
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      completions: conditionOption,
      forms: ssmParameters,
    });
    expect(results).toEqual(expectedResult);
  });
});

describe('Recurring - Completions completed', () => {
  test.each([
    {
      description: `set status to ${ACTIVE_SUBMITTED} if completed and requested is empty`,
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
        formId: ssmParameters.recurringFormId,
      },
    },
    {
      description: `set status to ${ACTIVE_SUBMITTED} if completed and some requested is true`,
      conditionOption: createConditionOption({
        requested: requestedSomeTrueList,
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
        formId: ssmParameters.recurringFormId,
      },
    },
    {
      description: `set status to ${ACTIVE_SUBMITTED} if completed and all requested is false`,
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
        formId: ssmParameters.recurringFormId,
      },
    },
    {
      description: `set status to ${ACTIVE_SUBMITTED} if completed regardless of other completions attribute state`,
      conditionOption: createConditionOption({
        isCompleted: true,
      }),
      expectedResult: {
        statusType: ACTIVE_SUBMITTED,
        state: VIVA_APPLICATION_RECEIVED,
        formId: ssmParameters.recurringFormId,
      },
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.createCompletionsResult({
      completions: conditionOption,
      forms: ssmParameters,
    });
    expect(results).toEqual(expectedResult);
  });
});
