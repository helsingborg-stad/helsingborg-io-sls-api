import {
  setCaseCompletions,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/setCaseCompletions';

import { VIVA_COMPLETION_REQUIRED, VIVA_RANDOM_CHECK_REQUIRED } from '../../src/libs/constants';

import type { CaseItem } from '../../../types/caseItem';
import { EncryptionType } from '../../../types/caseItem';

const ssmParameters = {
  recurringFormId: 'recurring',
  randomCheckFormId: 'randomCheck',
  completionFormId: 'completionForm',
  newApplicationFormId: 'newApplication',
  newApplicationRandomCheckFormId: 'newApplicationRandomCheck',
  newApplicationCompletionFormId: 'newApplicationCompletion',
};

const caseKeys = {
  PK: 'PK',
  SK: 'SK',
};

const input: LambdaRequest = {
  detail: {
    caseKeys,
  },
};

function getCaseItem(
  currentFormId: string,
  isRandomCheck: boolean,
  requested: { received: boolean; description: string }[]
): CaseItem {
  return {
    PK: caseKeys.PK,
    SK: caseKeys.SK,
    currentFormId,
    id: 'caseId',
    persons: [],
    state: 'SOME_STATE',
    expirationTime: 123,
    createdAt: 123,
    updatedAt: 456,
    status: {
      type: '',
      name: '',
      description: '',
    },
    forms: {
      abc123: {
        answers: [],
        encryption: {
          type: EncryptionType.Decrypted,
        },
        currentPosition: {
          currentMainStep: 0,
          currentMainStepIndex: 0,
          index: 0,
          level: 0,
          numberOfMainSteps: 0,
        },
      },
    },
    provider: 'VIVA',
    details: {
      workflowId: 'flowId',
      period: {
        startDate: 1,
        endDate: 2,
      },
      completions: {
        requested,
        dueDate: null,
        receivedDate: 123,
        description: null,
        attachmentUploaded: [],
        isRandomCheck,
        isDueDateExpired: false,
        isCompleted: false,
        isAttachmentPending: false,
      },
    },
  };
}

test.each([
  {
    description: 'it updates a recurring case for randomCheck with correct parameters',
    currentFormId: ssmParameters.recurringFormId,
    isRandomCheck: true,
    newCurrentFormId: ssmParameters.randomCheckFormId,
    requestedCompletions: [{ received: false, description: '' }],
    newState: VIVA_RANDOM_CHECK_REQUIRED,
  },
  {
    description: 'it updates a recurring case for completions with correct parameters',
    currentFormId: ssmParameters.recurringFormId,
    isRandomCheck: true,
    newCurrentFormId: ssmParameters.completionFormId,
    requestedCompletions: [{ received: true, description: '' }],
    newState: VIVA_COMPLETION_REQUIRED,
  },
  {
    description:
      'it updates a recurring case for completions with correct parameters, no completions received before',
    currentFormId: ssmParameters.recurringFormId,
    isRandomCheck: false,
    requestedCompletions: [{ received: false, description: '' }],
    newCurrentFormId: ssmParameters.completionFormId,
    newState: VIVA_COMPLETION_REQUIRED,
  },
  {
    description: 'it updates a new application case for randomCheck with correct parameters',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: true,
    requestedCompletions: [{ received: false, description: '' }],
    newCurrentFormId: ssmParameters.newApplicationRandomCheckFormId,
    newState: VIVA_RANDOM_CHECK_REQUIRED,
  },
  {
    description: 'it updates a new application case for completions with correct parameters',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: true,
    requestedCompletions: [{ received: true, description: '' }],
    newCurrentFormId: ssmParameters.newApplicationCompletionFormId,
    newState: VIVA_COMPLETION_REQUIRED,
  },
  {
    description:
      'it updates a new application case for completions with correct parameters, no completions received before',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: false,
    requestedCompletions: [{ received: false, description: '' }],
    newCurrentFormId: ssmParameters.newApplicationCompletionFormId,
    newState: VIVA_COMPLETION_REQUIRED,
  },
])(
  '$description',
  async ({ currentFormId, isRandomCheck, requestedCompletions, newCurrentFormId, newState }) => {
    const caseItem = getCaseItem(currentFormId, isRandomCheck, requestedCompletions);

    const updateCaseMock = jest.fn();
    const dependencies: Dependencies = {
      getCase: () => Promise.resolve(caseItem),
      putSuccessEvent: () => Promise.resolve(null),
      readParams: () => Promise.resolve(ssmParameters),
      updateCase: updateCaseMock,
    };

    const result = await setCaseCompletions(input, dependencies);

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledWith(
      caseKeys,
      expect.objectContaining({
        newCurrentFormId,
        newState,
      })
    );
  }
);
