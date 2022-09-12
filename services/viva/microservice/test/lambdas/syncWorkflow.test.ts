import {
  Dependencies,
  GetWorkflowResult,
  LambdaRequest,
  syncWorkflow,
} from '../../src/lambdas/syncWorkflow';
import { CaseItem } from '../../src/types/caseItem';

type MockDependencies = Dependencies & {
  workflow?: GetWorkflowResult;
};

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
      application: {},
    },
  } as GetWorkflowResult;
}

function createCase(workflowId: string = WORKFLOW_ID): CaseItem {
  return {
    PK: caseKeys.PK,
    SK: caseKeys.SK,
    details: {
      workflowId: workflowId,
    },
  } as unknown as CaseItem;
}

function createDependencies(partialDependencies?: Partial<MockDependencies>): MockDependencies {
  const syncWorkflowSuccess = jest.fn().mockResolvedValue(undefined);
  const workflow = createWorkflow();

  return {
    getSubmittedOrProcessingOrOngoingCases: async () => ({ Items: [createCase()] }),
    syncWorkflowSuccess: syncWorkflowSuccess,
    updateCaseDetailsWorkflow: () => Promise.resolve(),
    getWorkflow: () => Promise.resolve(workflow),
    workflow,
    ...partialDependencies,
  };
}

it('Syncs cases', async () => {
  const dependencies = createDependencies();

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).toHaveBeenCalledWith({
    caseKeys,
    workflow: dependencies.workflow,
  });
});

it("Doesn't sync cases with non-matching status", async () => {
  const dependencies = createDependencies({
    getSubmittedOrProcessingOrOngoingCases: () => Promise.resolve({ Items: [] }),
  });

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).not.toHaveBeenCalled();
});

it("Doesn't sync cases without workflow id", async () => {
  const dependencies = createDependencies({
    getSubmittedOrProcessingOrOngoingCases: () => Promise.resolve({ Items: [createCase('')] }),
  });

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).not.toHaveBeenCalled();
});
