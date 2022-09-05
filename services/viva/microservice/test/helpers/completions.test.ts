import { getStatusByType } from '../../src/libs/caseStatuses';
import {
  // status type
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
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

interface CreateConditionOptionParams {
  requested?: boolean | [];
  dueDate?: number;
  receivedDate?: number;
  isRandomCheck?: boolean;
  isAttachmentPending?: boolean;
  isCompleted?: boolean;
  isDueDateExpired?: boolean;
}

const recurringCompletionForms = {
  randomCheckFormId: '123ABC',
  completionFormId: '456CDF',
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

function createConditionOption(params: CreateConditionOptionParams): CaseCompletions {
  return {
    requested: Array.isArray(params.requested)
      ? [...params.requested]
      : [...(params.requested ? requestedSomeTrueList : requestedAllFalseList)],
    description: '',
    receivedDate: params.receivedDate ?? null,
    dueDate: params.dueDate ?? null,
    isCompleted: params.isCompleted ?? false,
    isDueDateExpired: params.isDueDateExpired ?? false,
    isRandomCheck: params.isRandomCheck ?? false,
    isAttachmentPending: params.isAttachmentPending ?? false,
    attachmentUploaded: [],
  };
}

describe('Form (getCompletionFormId)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
      }),
      expectedResult: recurringCompletionForms.randomCheckFormId,
      description: `isAttachmentPending is false, isRandomCheck is true, expect randomCheckFormId: ${recurringCompletionForms.randomCheckFormId}`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: recurringCompletionForms.randomCheckFormId,
      description: `isAttachmentPending is true, isRandomCheck is true expect randomCheckFormId: ${recurringCompletionForms.randomCheckFormId}`,
    },
    {
      conditionOption: createConditionOption({ requested: false }),
      expectedResult: recurringCompletionForms.completionFormId,
      description: `isAttachmentPending is false, isRandomCheck is false, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isAttachmentPending: true,
      }),
      expectedResult: recurringCompletionForms.completionFormId,
      description: `isAttachmentPending is true, isRandomCheck is false, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
    {
      conditionOption: createConditionOption({ requested: true }),
      expectedResult: recurringCompletionForms.completionFormId,
      description: `some requested is true, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const result = completionsHelper.get.formId(recurringCompletionForms, conditionOption);
    expect(result).toBe(expectedResult);
  });
});

describe('Random select (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
      }),
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA),
      description: `yet to be submitted, expect ${ACTIVE_RANDOM_CHECK_REQUIRED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA),
      description: `submitted with attachments, expect ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: true,
        isRandomCheck: true,
      }),
      expectedResult: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      description: `one or more requested received, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.status(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('None requested received (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: false,
        isAttachmentPending: true,
      }),
      expectedResult: getStatusByType(ACTIVE_COMPLETION_SUBMITTED_VIVA),
      description: `set status to ${ACTIVE_COMPLETION_SUBMITTED_VIVA} when attachment pending`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
        isAttachmentPending: true,
      }),
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA),
      description: `set status to ${ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA} when attachment pending and is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.status(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Requested received (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: true,
        isAttachmentPending: true,
      }),
      expectedResult: getStatusByType(ACTIVE_COMPLETION_SUBMITTED_VIVA),
      description: `submitted with attachments, expect ${ACTIVE_COMPLETION_SUBMITTED_VIVA}`,
    },
    {
      conditionOption: createConditionOption({
        requested: true,
      }),
      expectedResult: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      description: `completion requested, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.status(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions completed (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: [],
        isCompleted: true,
      }),
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and requested is empty`,
    },
    {
      conditionOption: createConditionOption({
        requested: true,
        isCompleted: true,
      }),
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and some requested is true`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isCompleted: true,
      }),
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and all requested is false`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isCompleted: true,
      }),
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed regardless of other completions attribute state`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.status(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions completed (getCompletionState)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: [],
        isCompleted: true,
      }),
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and requested is empty`,
    },
    {
      conditionOption: createConditionOption({
        requested: true,
        isCompleted: true,
      }),
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and some requested is true`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isCompleted: true,
      }),
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and all requested is false`,
    },
    {
      conditionOption: createConditionOption({
        requested: [],
        dueDate: 123,
        receivedDate: 123,
        isRandomCheck: true,
        isAttachmentPending: true,
        isCompleted: true,
        isDueDateExpired: true,
      }),
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed regardless of other completions attribute state`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.state(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('None requested received (getCompletionState)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: false,
      }),
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} when is not random check`,
    },
    {
      conditionOption: createConditionOption({
        requested: false,
        isRandomCheck: true,
      }),
      expectedResult: VIVA_RANDOM_CHECK_REQUIRED,
      description: `set state to ${VIVA_RANDOM_CHECK_REQUIRED} when is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.state(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('Requested received (getCompletionState)', () => {
  test.each([
    {
      conditionOption: createConditionOption({
        requested: true,
      }),
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} when is not random check`,
    },
    {
      conditionOption: createConditionOption({
        requested: true,
        isRandomCheck: true,
      }),
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} when is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = completionsHelper.get.state(conditionOption);
    expect(results).toBe(expectedResult);
  });
});
