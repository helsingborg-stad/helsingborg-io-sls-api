import { decideCaseStatus } from '../../src/lambdas/decideCaseStatus';

import { getStatusByType } from '../../src/libs/caseStatuses';
import { ACTIVE_PROCESSING } from '../../src/libs/constants';

import type { LambdaRequest } from '../../src/lambdas/decideCaseStatus';
import type {
  VivaWorkflow,
  VivaWorkflowApplication,
  VivaWorkflowDecisionRoot,
} from '../../src/types/vivaWorkflow';

const caseKeys = {
  PK: 'USER#198602102389',
  SK: 'CASE#11111111-2222-3333-4444-555555555555',
};

function createLambdaInput(
  workflowParams: Partial<VivaWorkflow> = {},
  workflowApplicationParams: Partial<VivaWorkflowApplication> = {}
): LambdaRequest {
  return {
    detail: {
      caseKeys,
      workflow: {
        workflowid: 'XYZ123',
        application: {
          islocked: null,
          ...workflowApplicationParams,
        },
        decision: {
          decisions: {
            decision: {
              typecode: 1,
            },
          },
        },
        ...workflowParams,
      } as VivaWorkflow,
    },
  } as unknown as LambdaRequest;
}

describe('decideCaseStatus', () => {
  it('successfully updates a case with new status', async () => {
    const updateCaseMock = jest.fn();
    const putSuccessEventMock = jest.fn();

    const result = await decideCaseStatus(createLambdaInput(), {
      updateCase: updateCaseMock,
      putSuccessEvent: putSuccessEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledWith(caseKeys, getStatusByType(ACTIVE_PROCESSING));
    expect(putSuccessEventMock).toHaveBeenCalledWith({ caseKeys: caseKeys });
  });

  it('fails updating case status for undefined new status type', async () => {
    const updateCaseMock = jest.fn();
    const putSuccessEventMock = jest.fn();

    const lambdaInput = {
      decision: {
        decisions: {
          decision: {
            typecode: '0',
          },
        },
      } as VivaWorkflowDecisionRoot,
    };

    const result = await decideCaseStatus(createLambdaInput(lambdaInput), {
      updateCase: updateCaseMock,
      putSuccessEvent: putSuccessEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledTimes(0);
    expect(putSuccessEventMock).toHaveBeenCalledTimes(0);
  });
});
