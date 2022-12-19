import { getStatusByType } from '../../src/libs/caseStatuses';
import { ACTIVE_PROCESSING, VIVA_APPLICATION_LOCKED } from '../../src/libs/constants';
import { decideCaseStatus } from '../../src/lambdas/decideCaseStatus';
import type { LambdaRequest } from '../../src/lambdas/decideCaseStatus';
import type { VivaWorkflow } from '../../src/types/vivaWorkflow';

const caseKeys = {
  PK: 'USER#198602102389',
  SK: 'CASE#11111111-2222-3333-4444-555555555555',
};

function createLambdaInput(workflowParams: Partial<VivaWorkflow> = {}): LambdaRequest {
  return {
    detail: {
      caseKeys,
      workflow: {
        workflowid: 'XYZ123',
        ...workflowParams,
      },
    },
  } as unknown as LambdaRequest;
}

describe('decideCaseStatus', () => {
  it('successfully updates a case with new status and state', async () => {
    const updateCaseMock = jest.fn();
    const putSuccessEventMock = jest.fn();

    const lambdaInput = {
      application: {
        islocked: '2022-01-01T00:00:00+01:00',
      },
    } as VivaWorkflow;

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      updateCase: updateCaseMock,
      putSuccessEvent: putSuccessEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledWith(
      caseKeys,
      getStatusByType(ACTIVE_PROCESSING),
      VIVA_APPLICATION_LOCKED
    );
    expect(putSuccessEventMock).toHaveBeenCalledWith({ caseKeys });
  });

  it('does not update case status if new status eq undefined', async () => {
    const updateCaseMock = jest.fn();
    const putSuccessEventMock = jest.fn();

    const lambdaInput = {
      application: {
        islocked: null,
      },
    } as VivaWorkflow;

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      updateCase: updateCaseMock,
      putSuccessEvent: putSuccessEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledTimes(0);
    expect(putSuccessEventMock).toHaveBeenCalledTimes(0);
  });

  it('does not update case status if new state eq undefined', async () => {
    const updateCaseMock = jest.fn();
    const putSuccessEventMock = jest.fn();

    const lambdaInput = {
      application: {
        islocked: null,
      },
      decision: {
        decisions: {
          decision: {
            typecode: '01',
          },
        },
      },
    } as VivaWorkflow;

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      updateCase: updateCaseMock,
      putSuccessEvent: putSuccessEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledTimes(0);
    expect(putSuccessEventMock).toHaveBeenCalledTimes(0);
  });
});
