import { getStatusByType } from '../../src/libs/caseStatuses';
import {
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  COMPLETIONS_RANDOM_SELECT,
  COMPLETIONS_REQUIRED,
  COMPLETIONS_PENDING,
} from '../../src/libs/constants';

function getCompletionFormId(completionForms, completions) {
  const { randomCheckFormId, completionFormId } = completionForms;
  return isRandomSelect(completions) ? randomCheckFormId : completionFormId;
}

function getCompletionStatus(completions) {
  return isRandomSelect(completions)
    ? getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA)
    : getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA);
}

function getCompletionState(completions) {
  if (isRandomSelect(completions)) {
    return COMPLETIONS_RANDOM_SELECT;
  }

  if (completions.isAttachmentPending) {
    return COMPLETIONS_PENDING;
  }

  return COMPLETIONS_REQUIRED;
}

function isRandomSelect(completions) {
  const { isRandomCheck, isAttachmentPending, requested } = completions;
  return isRandomCheck && !isAttachmentPending && !isAnyRequestedCompletionsReceived(requested);
}

function isAnyRequestedCompletionsReceived(requestedList) {
  return requestedList.reduce((received, current) => {
    if (current.received) {
      return true;
    }
    return received;
  }, undefined);
}

const expectedRandomCheckStatus = {
  type: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  name: 'Stickprovskontroll',
  description:
    'Du måste komplettera din ansökan med bilder som visar dina utgifter och inkomster. Vi behöver din komplettering inom 4 dagar för att kunna betala ut pengar för perioden.',
};

const expectCompletionStatus = {
  type: ACTIVE_COMPLETION_REQUIRED_VIVA,
  name: 'Ansökan behöver kompletteras',
  description:
    'Du har skickat in en ansökan för #MONTH_NAME. För att vi ska kunna behandla din ansökan finns det uppgifter som du behöver komplettera.\n\nKomplettering ska ha skickats in till oss senast #COMPLETION_DUEDATE.',
};

const recurringCompletionsForms = {
  randomCheckFormId: '123',
  completionFormId: '456',
};

const completionsInitialRandomCheck = {
  requested: [
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
  ],
  dueDate: 1648249200000,
  isRandomCheck: true,
  isAttachmentPending: false,
  receivedDate: null,
  isCompleted: false,
  isDueDateExpired: false,
};

const completionsAttachmentPending = {
  requested: [
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
  ],
  dueDate: 1648249200000,
  isRandomCheck: true,
  isAttachmentPending: true,
  receivedDate: null,
  isCompleted: false,
  isDueDateExpired: false,
};

const completionsRequestedPartialyReceived = {
  requested: [
    {
      description: 'Underlag på alla sökta utgifter',
      received: true,
    },
    {
      description: 'Underlag på alla inkomster/tillgångar',
      received: false,
    },
    {
      description: 'Alla kontoutdrag för hela förra månaden och fram till idag',
      received: false,
    },
  ],
  dueDate: 1648249200000,
  isRandomCheck: true,
  isAttachmentPending: false,
  receivedDate: null,
  isCompleted: false,
  isDueDateExpired: false,
};

const completionsDefault = {
  requested: [
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
  ],
  dueDate: 1648249200000,
  isRandomCheck: false,
  isAttachmentPending: false,
  receivedDate: null,
  isCompleted: false,
  isDueDateExpired: false,
};

const completionsAttachmentPendingNotRandomCheck = {
  ...completionsAttachmentPending,
  isRandomCheck: false,
};

const completionsAttachmentPendingAndRequestedPartialyReceivedNotRandomCheck = {
  ...completionsRequestedPartialyReceived,
  isRandomCheck: false,
  isAttachmentPending: true,
};

it('Returns form id of form type > recurring random check', () => {
  const results = getCompletionFormId(recurringCompletionsForms, completionsInitialRandomCheck);
  expect(results).toBe('123');
});

it('Returns form id of form type > recurring completion', () => {
  const results = getCompletionFormId(recurringCompletionsForms, completionsAttachmentPending);
  expect(results).toBe('456');
});

it('Returns status for recurring random check', () => {
  const results = getCompletionStatus(completionsInitialRandomCheck);
  expect(results).toEqual(expectedRandomCheckStatus);
});

it('Returns status for recurring completion when attachment peinding', () => {
  const results = getCompletionStatus(completionsAttachmentPending);
  expect(results).toEqual(expectCompletionStatus);
});

it('Returns status for recurring completion when request completions is partialy received', () => {
  const results = getCompletionStatus(completionsRequestedPartialyReceived);
  expect(results).toEqual(expectCompletionStatus);
});

it('Returns status for recurring completion when requesting completions AND NO attachemnt is uploaded', () => {
  const results = getCompletionStatus(completionsDefault);
  expect(results).toEqual(expectCompletionStatus);
});

it('Returns status for recurring completion when requesting completions AND is pending AND is NOT random check', () => {
  const results = getCompletionStatus(completionsAttachmentPendingNotRandomCheck);
  expect(results).toEqual(expectCompletionStatus);
});

it('Returns state for recurring random select', () => {
  const results = getCompletionState(completionsInitialRandomCheck);
  expect(results).toEqual(COMPLETIONS_RANDOM_SELECT);
});

it('Returns state for recurring completion pending', () => {
  const results = getCompletionState(
    completionsAttachmentPendingAndRequestedPartialyReceivedNotRandomCheck
  );
  expect(results).toEqual(COMPLETIONS_PENDING);
});

it('Returns state for recurring completion required', () => {
  const results = getCompletionState(completionsDefault);
  expect(results).toEqual(COMPLETIONS_REQUIRED);
});
