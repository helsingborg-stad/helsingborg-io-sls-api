import { GetWorkflowResult, LambdaRequest, syncWorkflow } from '../../src/lambdas/syncWorkflow';
import { EncryptionType } from '../../../types/caseItem';
import { CaseItem } from '../../src/types/caseItem';

const PK = 'USER#199001011234';
const SK = 'CASE#11111111-2222-3333-4444-555555555555';
const WORKFLOW_ID = 'flowId123ABC';

const caseKeys = {
  PK,
  SK,
};

const input: LambdaRequest = {
  detail: {
    user: {
      personalNumber: '199801011234',
    },
  },
};

function createWorkflow(): GetWorkflowResult {
  return {
    attributes: {
      workflowid: WORKFLOW_ID,
      application: {
        completiondate: null,
        completiondescription: '',
        completionduedate: null,
        completionreceiveddate: null,
        completions: null,
        completionsreceived: null,
        completionsuploaded: null,
        islocked: null,
        islockedwithoutcompletionreceived: null,
        otherperiod: null,
        periodenddate: null,
        periodstartdate: null,
        receiveddate: null,
        requestingcompletion: null,
      },
    },
  };
}

function createCase(workflowId: string = WORKFLOW_ID): CaseItem {
  return {
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
      type: 'active:submitted',
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
      workflowId: workflowId,
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
}

it('Syncs cases', async () => {
  const syncWorkflowSuccess = jest.fn().mockResolvedValue(undefined);

  const workflow = createWorkflow();

  const result = await syncWorkflow(input, {
    getSubmittedOrProcessingOrOngoingCases: () => Promise.resolve({ Items: [createCase()] }),
    syncWorkflowSuccess: syncWorkflowSuccess,
    updateCaseDetailsWorkflow: () => Promise.resolve(),
    getWorkflow: () => Promise.resolve(workflow),
  });

  expect(result).toBe(true);
  expect(syncWorkflowSuccess).toHaveBeenCalledWith({ caseKeys, workflow });
});

it("Doesn't sync cases with non-matching status", async () => {
  const syncWorkflowSuccess = jest.fn().mockResolvedValue(undefined);

  const workflow = createWorkflow();

  const result = await syncWorkflow(input, {
    getSubmittedOrProcessingOrOngoingCases: () => Promise.resolve({ Items: [] }),
    syncWorkflowSuccess: syncWorkflowSuccess,
    updateCaseDetailsWorkflow: () => Promise.resolve(),
    getWorkflow: () => Promise.resolve(workflow),
  });

  expect(result).toBe(true);
  expect(syncWorkflowSuccess).not.toHaveBeenCalled();
});

it("Doesn't sync cases without workflow id", async () => {
  const syncWorkflowSuccess = jest.fn().mockResolvedValue(undefined);

  const workflow = createWorkflow();

  const result = await syncWorkflow(input, {
    getSubmittedOrProcessingOrOngoingCases: () => Promise.resolve({ Items: [createCase('')] }),
    syncWorkflowSuccess: syncWorkflowSuccess,
    updateCaseDetailsWorkflow: () => Promise.resolve(),
    getWorkflow: () => Promise.resolve(workflow),
  });

  expect(result).toBe(true);
  expect(syncWorkflowSuccess).not.toHaveBeenCalled();
});
