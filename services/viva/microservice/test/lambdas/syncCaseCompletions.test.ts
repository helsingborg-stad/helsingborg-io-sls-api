import {
  syncCaseCompletions,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/syncCaseCompletions';

import type { CaseItem } from '../../../types/caseItem';
import { EncryptionType } from '../../../types/caseItem';
import { VadaWorkflowCompletions } from '../../src/types/vadaCompletions';

const caseKeys = {
  PK: 'PK',
  SK: 'SK',
};

const workflowId = 'flowId123ABC';

const input: LambdaRequest = {
  detail: {
    user: {
      personalNumber: '199801011234',
      firstName: 'Otto',
      lastName: 'Ottosson',
    },
    status: [
      {
        code: 64,
        description: 'You are requested to provide completary information',
      },
    ],
  },
};

const caseToUpdate: CaseItem = {
  PK: caseKeys.PK,
  SK: caseKeys.SK,
  currentFormId: '123ABC',
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
    workflowId,
    period: {
      startDate: 1,
      endDate: 2,
    },
    completions: {
      requested: [],
      description: null,
      receivedDate: null,
      dueDate: null,
      attachmentUploaded: [],
      isCompleted: false,
      isRandomCheck: false,
      isAttachmentPending: false,
      isDueDateExpired: false,
    },
  },
};

const vadaCompletions: VadaWorkflowCompletions = {
  requested: [
    {
      description: 'Lorem ipsum dolor sit amet',
      received: false,
    },
  ],
  description: 'Some completions information',
  receivedDate: null,
  dueDate: 123,
  attachmentUploaded: [],
  isCompleted: false,
  isRandomCheck: true,
  isAttachmentPending: false,
  isDueDateExpired: false,
};

function createDependencies(
  statusCode: boolean,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    putSuccessEvent: () => Promise.resolve(),
    updateCase: () => Promise.resolve(),
    validateStatusCode: () => statusCode,
    getLatestWorkflowId: () => Promise.resolve(workflowId),
    getWorkflowCompletions: () => Promise.resolve(vadaCompletions),
    getCaseOnWorkflowId: () => Promise.resolve(caseToUpdate),
    ...partialDependencies,
  };
}

it('updates a case with new completion information received from Viva', async () => {
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies(false, { updateCase: updateCaseMock });
  const result = await syncCaseCompletions(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledWith(
    caseKeys,
    expect.objectContaining(vadaCompletions)
  );
});

it('does nothing if Viva status code is 1', async () => {
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies(true, { updateCase: updateCaseMock });
  const result = await syncCaseCompletions(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});
