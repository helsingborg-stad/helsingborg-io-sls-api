import {
  syncCaseCompletions,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/syncCaseCompletions';

import type { CaseItem } from '../../../types/caseItem';
import { EncryptionType } from '../../../types/caseItem';
import { VadaWorkflowCompletions } from '../../src/types/vadaCompletions';

import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../../../helpers/constants';

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
        desciption: 'You are requested to provide completary information',
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

test.each([
  {
    description: 'it updates a recurring case with completions information received from Viva',
    newCompletions: vadaCompletions,
  },
])('$description', async ({ newCompletions }) => {
  const updateCaseMock = jest.fn();
  const dependencies: Dependencies = {
    putSuccessEvent: () => Promise.resolve(),
    updateCase: updateCaseMock,
    validateStatusCode: () => true,
    getLatestWorkflowId: () => Promise.resolve(workflowId),
    getWorkflowCompletions: () => Promise.resolve(newCompletions),
    getCaseOnWorkflowId: () => Promise.resolve(caseToUpdate),
  };

  const result = await syncCaseCompletions(input, dependencies);
  expect(result).toBe(true);
  expect(updateCaseMock).toHaveBeenCalledWith(caseKeys, expect.objectContaining(vadaCompletions));
});
