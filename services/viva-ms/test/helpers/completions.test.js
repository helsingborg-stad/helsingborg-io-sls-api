import { getStatusByType } from '../../src/libs/caseStatuses';
import {
  // status type
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED,
  ACTIVE_SUBMITTED,

  // state
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
  COMPLETIONS_PENDING,
} from '../../src/libs/constants';
import {
  getCompletionFormId,
  getCompletionStatus,
  getCompletionState,
} from '../../src/helpers/completions';

const recurringCompletionForms = {
  randomCheckFormId: '123ABC',
  completionFormId: '456CDF',
};

const requestedAllFalseList = [
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

const requestedSomeTrueList = [
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

const requestedEmpty = [];

describe('Completions form (getCompletionFormId)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: recurringCompletionForms.randomCheckFormId,
      description: `isAttachmentPending is false, isRandomCheck is true, expect randomCheckFormId: ${recurringCompletionForms.randomCheckFormId}`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: recurringCompletionForms.randomCheckFormId,
      description: `isAttachmentPending is true, isRandomCheck is true expect randomCheckFormId: ${recurringCompletionForms.randomCheckFormId}`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: false,
        isAttachmentPending: false,
      },
      expectedResult: recurringCompletionForms.completionFormId,
      description: `isAttachmentPending is false, isRandomCheck is false, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: false,
        isAttachmentPending: true,
      },
      expectedResult: recurringCompletionForms.completionFormId,
      description: `isAttachmentPending is true, isRandomCheck is false, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
      },
      expectedResult: recurringCompletionForms.completionFormId,
      description: `some requested is true, expect completionFormId: ${recurringCompletionForms.completionFormId}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const result = getCompletionFormId(recurringCompletionForms, conditionOption);
    expect(result).toBe(expectedResult);
  });
});

describe('Completions random select (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA),
      description: `yet to be submitted, expect ${ACTIVE_RANDOM_CHECK_REQUIRED_VIVA}`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED),
      description: `submitted with attachments, expect ${ACTIVE_RANDOM_CHECK_SUBMITTED}`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      description: `one or more requested received, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionStatus(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions some requested received (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: false,
        isAttachmentPending: true,
      },
      expectedResult: getStatusByType(ACTIVE_COMPLETION_SUBMITTED),
      description: `submitted with attachments, expect ${ACTIVE_COMPLETION_SUBMITTED}`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: false,
        isAttachmentPending: false,
      },
      expectedResult: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      description: `completion requested, expect ${ACTIVE_COMPLETION_REQUIRED_VIVA}`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionStatus(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions request all (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: false,
        isAttachmentPending: true,
      },
      expectedResult: getStatusByType(ACTIVE_COMPLETION_SUBMITTED),
      description: `set status to ${ACTIVE_COMPLETION_SUBMITTED} when attachment pending`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED),
      description: `set status to ${ACTIVE_RANDOM_CHECK_SUBMITTED} when attachment pending and is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionStatus(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions completed (getCompletionStatus)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedEmpty],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and requested is empty`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and some requested is true`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: getStatusByType(ACTIVE_SUBMITTED),
      description: `set status to ${ACTIVE_SUBMITTED} if completed and all requested is false`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionStatus(conditionOption);
    expect(results).toEqual(expectedResult);
  });
});

describe('Completions random select (getCompletionState)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: VIVA_RANDOM_CHECK_REQUIRED,
      description: `set state to ${VIVA_RANDOM_CHECK_REQUIRED} the first time`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: COMPLETIONS_PENDING,
      description: `set state to ${COMPLETIONS_PENDING} when uploaded attachments`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionState(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('Completions random select, requested received (getCompletionState)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} the first time`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: COMPLETIONS_PENDING,
      description: `set state to ${COMPLETIONS_PENDING} when uploaded attachments`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionState(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('Completions requesting (getCompletionState)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: false,
        isAttachmentPending: false,
      },
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} the first time`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        isRandomCheck: false,
        isAttachmentPending: true,
      },
      expectedResult: COMPLETIONS_PENDING,
      description: `set state to ${COMPLETIONS_PENDING} when uploaded attachments`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionState(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('Completions completed (getCompletionState)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedEmpty],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and requested is empty`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and some requested is true`,
    },
    {
      conditionOption: {
        requested: [...requestedAllFalseList],
        dueDate: null,
        isRandomCheck: false,
        isAttachmentPending: false,
        receiveDate: null,
        isCompleted: true,
        isDueDateExpired: false,
      },
      expectedResult: VIVA_APPLICATION_RECEIVED,
      description: `set state to ${VIVA_APPLICATION_RECEIVED} if completed and all requested is false`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionState(conditionOption);
    expect(results).toBe(expectedResult);
  });
});

describe('Completions requested received (getCompletionState)', () => {
  test.each([
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: false,
        isAttachmentPending: false,
      },
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} the first time`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: true,
        isAttachmentPending: false,
      },
      expectedResult: VIVA_COMPLETION_REQUIRED,
      description: `set state to ${VIVA_COMPLETION_REQUIRED} the first time and is random check`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: false,
        isAttachmentPending: true,
      },
      expectedResult: COMPLETIONS_PENDING,
      description: `set state to ${COMPLETIONS_PENDING} when uploaded attachments`,
    },
    {
      conditionOption: {
        requested: [...requestedSomeTrueList],
        isRandomCheck: true,
        isAttachmentPending: true,
      },
      expectedResult: COMPLETIONS_PENDING,
      description: `set state to ${COMPLETIONS_PENDING} when uploaded attachments and is random check`,
    },
  ])('$description', ({ conditionOption, expectedResult }) => {
    const results = getCompletionState(conditionOption);
    expect(results).toBe(expectedResult);
  });
});
