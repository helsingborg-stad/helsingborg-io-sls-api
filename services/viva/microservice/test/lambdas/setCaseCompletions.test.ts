import { getStatusByType } from '../../src/libs/caseStatuses';

import {
  setCaseCompletions,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/setCaseCompletions';

import {
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_SUBMITTED,
  ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,
  VIVA_RANDOM_CHECK_REQUIRED,
  VIVA_COMPLETION_REQUIRED,
  VIVA_APPLICATION_RECEIVED,
} from '../../src/libs/constants';

import type { CaseItem } from '../../../types/caseItem';
import { EncryptionType } from '../../../types/caseItem';

const ssmParameters = {
  recurringFormId: 'recurring',
  completionFormId: 'completionForm',
  randomCheckFormId: 'randomCheck',
  newApplicationFormId: 'newApplication',
  newApplicationCompletionFormId: 'completionForm',
  newApplicationRandomCheckFormId: 'newApplicationRandomCheck',
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

function createCaseItem(partialCaseItem: Partial<CaseItem>): CaseItem {
  return {
    PK: caseKeys.PK,
    SK: caseKeys.SK,
    currentFormId: '123abc',
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
          symmetricKeyName: '00000000-0000-0000-0000-000000000000',
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
        requested: [],
        dueDate: null,
        receivedDate: 123,
        description: null,
        attachmentUploaded: [],
        isRandomCheck: false,
        isDueDateExpired: false,
        isCompleted: false,
        isAttachmentPending: false,
      },
    },
    ...partialCaseItem,
  } as CaseItem;
}

test.each([
  {
    description:
      'it updates a recurring case as submitted, when all requested completions are received',
    isRandomCheck: true,
    isCompleted: true,
    isAttachmentPending: false,
    newCurrentFormId: ssmParameters.completionFormId,
    requestedCompletions: [{ received: true }],
    completionsResult: {
      status: getStatusByType(ACTIVE_SUBMITTED),
      state: VIVA_APPLICATION_RECEIVED,
    },
  },
  {
    description: 'it updates a recurring case for randomCheck',
    isRandomCheck: true,
    isCompleted: false,
    isAttachmentPending: false,
    newCurrentFormId: ssmParameters.randomCheckFormId,
    requestedCompletions: [{ received: false }],
    completionsResult: {
      status: getStatusByType(ACTIVE_RANDOM_CHECK_REQUIRED_VIVA),
      state: VIVA_RANDOM_CHECK_REQUIRED,
    },
  },
  {
    description: 'it updates a recurring case for completions, requested received',
    isRandomCheck: false,
    isCompleted: false,
    isAttachmentPending: false,
    newCurrentFormId: ssmParameters.completionFormId,
    requestedCompletions: [{ received: true }],
    completionsResult: {
      status: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      state: VIVA_COMPLETION_REQUIRED,
    },
  },
  {
    description: 'it updates a recurring case for completions, requested not received',
    isRandomCheck: false,
    isCompleted: false,
    isAttachmentPending: false,
    requestedCompletions: [{ received: false }],
    newCurrentFormId: ssmParameters.completionFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      state: VIVA_COMPLETION_REQUIRED,
    },
  },
  {
    description: 'it updates a new application case for randomCheck',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: true,
    isCompleted: false,
    isAttachmentPending: false,
    requestedCompletions: [{ received: false }],
    newCurrentFormId: ssmParameters.newApplicationRandomCheckFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA),
      state: VIVA_RANDOM_CHECK_REQUIRED,
    },
  },
  {
    description: 'it updates a new application case for completions, requested received',
    currentFormId: ssmParameters.newApplicationRandomCheckFormId,
    isRandomCheck: false,
    isCompleted: false,
    isAttachmentPending: false,
    requestedCompletions: [{ received: true }],
    newCurrentFormId: ssmParameters.newApplicationCompletionFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      state: VIVA_COMPLETION_REQUIRED,
    },
  },
  {
    description: 'it updates a new application case for completions, requested not received',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: false,
    isCompleted: false,
    isAttachmentPending: false,
    requestedCompletions: [{ received: false }],
    newCurrentFormId: ssmParameters.newApplicationCompletionFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_COMPLETION_REQUIRED_VIVA),
      state: VIVA_COMPLETION_REQUIRED,
    },
  },
  {
    description: 'it updates a new application case for submitted random check',
    currentFormId: ssmParameters.newApplicationFormId,
    isRandomCheck: true,
    isCompleted: false,
    isAttachmentPending: true,
    requestedCompletions: [{ received: false }],
    newCurrentFormId: ssmParameters.newApplicationRandomCheckFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA),
      state: VIVA_RANDOM_CHECK_REQUIRED,
    },
  },
  {
    description: 'it updates a new application case for submitted completions',
    currentFormId: ssmParameters.newApplicationRandomCheckFormId,
    isRandomCheck: false,
    isCompleted: false,
    isAttachmentPending: true,
    requestedCompletions: [{ received: false }],
    newCurrentFormId: ssmParameters.newApplicationCompletionFormId,
    completionsResult: {
      status: getStatusByType(ACTIVE_COMPLETION_SUBMITTED_VIVA),
      state: VIVA_COMPLETION_REQUIRED,
    },
  },
])(
  '$description',
  async ({
    currentFormId,
    isRandomCheck,
    isCompleted,
    isAttachmentPending,
    requestedCompletions,
    newCurrentFormId,
    completionsResult,
  }) => {
    const createParams = {
      currentFormId,
      details: {
        completions: {
          isRandomCheck,
          requested: requestedCompletions,
          attachmentUploaded: [],
          isCompleted,
          isAttachmentPending,
        },
      },
    } as unknown as CaseItem;
    const caseItem = createCaseItem(createParams);

    const updateCaseMock = jest.fn();
    const dependencies: Dependencies = {
      getCase: () => Promise.resolve(caseItem),
      putSuccessEvent: () => Promise.resolve(),
      readParams: () => Promise.resolve(ssmParameters),
      updateCase: updateCaseMock,
    };

    const result = await setCaseCompletions(input, dependencies);

    expect(result).toBe(true);
    expect(dependencies.updateCase).toHaveBeenCalledWith(
      caseKeys,
      expect.objectContaining({
        newStatus: completionsResult.status,
        newState: completionsResult.state,
        newCurrentFormId,
        newPersons: [],
      })
    );
  }
);
