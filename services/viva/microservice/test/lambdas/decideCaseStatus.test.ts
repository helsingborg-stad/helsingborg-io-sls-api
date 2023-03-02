import { getStatusByType } from '../../src/libs/caseStatuses';
import { ACTIVE_PROCESSING, VIVA_APPLICATION_LOCKED } from '../../src/libs/constants';
import { decideCaseStatus } from '../../src/lambdas/decideCaseStatus';
import type { LambdaRequest } from '../../src/lambdas/decideCaseStatus';
import type { VivaWorkflow } from '../../src/types/vivaWorkflow';
import type { CaseItem } from '../../src/types/caseItem';

const caseKeys = {
  PK: 'USER#198602102389',
  SK: 'CASE#11111111-2222-3333-4444-555555555555',
};

const caseState = 'SOME_STATE';

function createLambdaInput(params: Partial<VivaWorkflow> = {}): LambdaRequest {
  return {
    detail: {
      caseKeys,
      caseState,
      workflow: {
        workflowid: 'XYZ123',
        ...params,
      },
    },
  } as LambdaRequest;
}

function createCase(params: Partial<CaseItem>): Promise<CaseItem> {
  return Promise.resolve({
    details: {
      workflow: {
        workflowid: 'XYZ123',
        application: {
          islocked: '2022-01-01T00:00:00+01:00',
        },
      },
    },
    ...params,
  } as CaseItem);
}

describe('decideCaseStatus', () => {
  it('successfully updates a case with new status and state', async () => {
    const updateCaseMock = jest.fn();
    const triggerEventMock = jest.fn();

    const lambdaInput = {
      application: {
        islocked: '2022-01-01T00:00:00+01:00',
      },
    } as VivaWorkflow;

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      getCase: createCase,
      updateCase: updateCaseMock,
      triggerEvent: triggerEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledWith(
      caseKeys,
      getStatusByType(ACTIVE_PROCESSING),
      VIVA_APPLICATION_LOCKED
    );
    expect(triggerEventMock).toHaveBeenCalledWith({ caseKeys, caseState: VIVA_APPLICATION_LOCKED });
  });

  it('does not update case status if new status is undefined', async () => {
    const updateCaseMock = jest.fn();
    const triggerEventMock = jest.fn();

    const lambdaInput = {
      application: {
        islocked: null,
      },
    } as VivaWorkflow;

    const mockCase = {
      details: {
        workflow: undefined,
      },
    } as CaseItem;

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      getCase: () => createCase(mockCase),
      updateCase: updateCaseMock,
      triggerEvent: triggerEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledTimes(0);
    expect(triggerEventMock).toHaveBeenCalledTimes(1);
  });

  it('does not update case state if new state is undefined', async () => {
    const updateCaseMock = jest.fn();
    const triggerEventMock = jest.fn();

    const mockCase = {
      details: {
        workflow: {
          application: {
            islocked: null,
          },
        },
      },
    } as CaseItem;

    const result = await decideCaseStatus(createLambdaInput(), {
      getCase: () => createCase(mockCase),
      updateCase: updateCaseMock,
      triggerEvent: triggerEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledTimes(0);
    expect(triggerEventMock).toHaveBeenCalledTimes(1);
  });
});
