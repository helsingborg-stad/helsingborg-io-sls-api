import {
  ACTIVE_ONGOING,
  ACTIVE_SUBMITTED,
  ACTIVE_PROCESSING,
  CLOSED,
} from '../../src/libs/constants';
import {
  Dependencies,
  LambdaRequest,
  syncWorkflow,
  createAttributeValues,
  filterExpressionMapper,
} from '../../src/lambdas/syncWorkflow';
import type { CaseItem } from '../../src/types/caseItem';
import type { VivaWorkflow } from '../../src/types/vivaWorkflow';

type MockDependencies = Dependencies & {
  workflow?: VivaWorkflow;
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

function createWorkflow(): VivaWorkflow {
  return {
    workflowid: WORKFLOW_ID,
    application: {},
  } as VivaWorkflow;
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
    getCasesByStatusType: async () => [createCase()],
    syncWorkflowSuccess: syncWorkflowSuccess,
    updateCase: () => Promise.resolve(),
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
    getCasesByStatusType: () => Promise.resolve([]),
  });

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).not.toHaveBeenCalled();
});

it("Doesn't sync cases without workflow id", async () => {
  const dependencies = createDependencies({
    getCasesByStatusType: () => Promise.resolve([createCase('')]),
  });

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).not.toHaveBeenCalled();
});

it('Syncs cases with multiple status types', async () => {
  const dependencies = createDependencies({
    getCasesByStatusType: () => Promise.resolve([createCase(), createCase()]),
  });

  const result = await syncWorkflow(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.syncWorkflowSuccess).toHaveBeenCalledTimes(2);
});

it('Creates query filter expression', async () => {
  const statusTypeList = [ACTIVE_ONGOING, ACTIVE_SUBMITTED, ACTIVE_PROCESSING, CLOSED];
  const filterExpression = statusTypeList.map(filterExpressionMapper).join(' or ');

  expect(filterExpression).toBe(
    'begins_with(#status.#type, :statusTypeOngoing) or begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing) or begins_with(#status.#type, :statusTypeClosed)'
  );
});

it('Creates query expression attribute values', async () => {
  const statusTypeList = ['active:ongoing', 'active:submitted', 'active:processing', 'closed'];

  const expressionAttributeValues = statusTypeList.reduce((acc, statusType) => {
    return { ...acc, ...createAttributeValues(statusType) };
  }, {});

  expect(expressionAttributeValues).toEqual({
    ':statusTypeClosed': 'closed',
    ':statusTypeOngoing': 'active:ongoing',
    ':statusTypeProcessing': 'active:processing',
    ':statusTypeSubmitted': 'active:submitted',
  });
});
