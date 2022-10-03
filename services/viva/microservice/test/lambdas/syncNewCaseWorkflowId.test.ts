import { TraceException } from '../../src/helpers/TraceException';
import {
  Dependencies,
  LambdaRequest,
  GetCaseResponse,
  syncNewCaseWorkflowId,
} from '../../src/lambdas/syncNewCaseWorkflowId';
import type { CaseItem } from '../../src/types/caseItem';
import type { VivaWorkflow } from '../../src/types/vivaWorkflow';

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
      personalNumber: '199001011234',
    },
    status: [
      {
        code: 128,
        description: 'Lorem ipsum dolor sit amet',
      },
      {
        code: 256,
        description: 'Lorem ipsum dolor sit amet',
      },
      {
        code: 512,
        description: 'Lorem ipsum dolor sit amet',
      },
    ],
  },
};

function createWorkflow(): VivaWorkflow {
  return {
    workflowid: WORKFLOW_ID,
  } as VivaWorkflow;
}

function createGetCaseReponse(): GetCaseResponse {
  return {
    Count: 1,
    Items: [
      {
        PK: caseKeys.PK,
        SK: caseKeys.SK,
        details: {
          workflowId: null,
        },
        currentFormId: 'newApplicationFormId',
      } as CaseItem,
    ],
    ScannedCount: 10,
  };
}

function createDependencies(partialDependencies?: Partial<Dependencies>): Dependencies {
  return {
    requestId: 'requestId',
    getCase: jest.fn().mockResolvedValue(createGetCaseReponse()),
    updateCase: jest.fn().mockResolvedValue(undefined),
    syncSuccess: jest.fn().mockResolvedValue(undefined),
    getLatestWorkflow: jest.fn().mockResolvedValue(createWorkflow()),
    readParams: () =>
      Promise.resolve({
        recurringFormId: 'recurringFormId',
        randomCheckFormId: 'randomCheckFormId',
        completionFormId: 'completionFormId',
        newApplicationFormId: 'newApplicationFormId',
        newApplicationRandomCheckFormId: 'newApplicationRandomCheckFormId',
        newApplicationCompletionFormId: 'newApplicationCompletionFormId',
      }),
    ...partialDependencies,
  };
}

it('Syncs new case with workflow id', async () => {
  const dependencies = createDependencies();

  const result = await syncNewCaseWorkflowId(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getCase).toHaveBeenCalledWith(input.detail.user.personalNumber);
  expect(dependencies.getLatestWorkflow).toHaveBeenCalledWith(input.detail.user.personalNumber);
  expect(dependencies.updateCase).toHaveBeenCalledWith(caseKeys, WORKFLOW_ID);
});

it('Does not sync new case if no match on status', async () => {
  const input: LambdaRequest = {
    detail: {
      user: {
        personalNumber: '199001011234',
      },
      status: [
        {
          code: 1,
          description: 'Lorem ipsum dolor sit amet',
        },
      ],
    },
  };

  const dependencies = createDependencies();

  const result = await syncNewCaseWorkflowId(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getCase).toHaveBeenCalledTimes(0);
  expect(dependencies.getLatestWorkflow).toHaveBeenCalledTimes(0);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});

it('Does not sync new case if got more than one case', async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue({
      Count: 2,
      Items: [],
      ScannedCount: 10,
    }),
  });

  const result = await syncNewCaseWorkflowId(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getLatestWorkflow).toHaveBeenCalledTimes(0);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});

it('Does not sync new case if current form id not match', async () => {
  const dependencies = createDependencies({
    readParams: jest.fn().mockResolvedValue({
      newApplicationFormId: 'badFormId',
    }),
  });

  const result = await syncNewCaseWorkflowId(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getLatestWorkflow).toHaveBeenCalledTimes(0);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});

it('Throws error if workflow id not found in Viva', async () => {
  const dependencies = createDependencies({
    getLatestWorkflow: jest.fn().mockResolvedValue(undefined),
  });

  await expect(syncNewCaseWorkflowId(input, dependencies)).rejects.toThrow(TraceException);
});
