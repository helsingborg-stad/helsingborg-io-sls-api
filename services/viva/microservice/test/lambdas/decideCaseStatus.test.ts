import { getStatusByType } from '../../src/libs/caseStatuses';
import {
  ACTIVE_PROCESSING,
  VIVA_APPLICATION_LOCKED,
  ACTIVE_SUBMITTED,
} from '../../src/libs/constants';
import { decideCaseStatus } from '../../src/lambdas/decideCaseStatus';
import type { LambdaRequest, LambdaDetail } from '../../src/lambdas/decideCaseStatus';
import type { CaseItem } from '../../src/types/caseItem';

const caseKeys = {
  PK: 'USER#198602102389',
  SK: 'CASE#11111111-2222-3333-4444-555555555555',
};

const caseState = 'VIVA_APPLICATION_LOCKED';

function createLambdaInput(params: Partial<LambdaDetail>): LambdaRequest {
  return {
    detail: {
      vivaApplicantStatusCodeList: [],
      workflowCompletions: {
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
      caseKeys,
      caseState,
      caseStatusType: ACTIVE_SUBMITTED,
      ...params,
    },
  };
}

function createCase(params: Partial<CaseItem>): CaseItem {
  return {
    status: {
      type: undefined,
    },
    state: undefined,
    details: {
      workflow: {
        workflowid: 'XYZ123',
        application: {
          islocked: '2022-01-01T00:00:00+01:00',
        },
      },
    },
    ...params,
  } as CaseItem;
}

describe('decideCaseStatus', () => {
  it('successfully updates a case with new status and state', async () => {
    const updateCaseMock = jest.fn();
    const triggerEventMock = jest.fn();
    const lambdaInput = createLambdaInput({ caseKeys });

    const result = await decideCaseStatus(lambdaInput, {
      getCase: () => Promise.resolve(createCase(caseKeys)),
      updateCase: updateCaseMock,
      triggerEvent: triggerEventMock,
    });

    expect(result).toBe(true);
    expect(updateCaseMock).toHaveBeenCalledWith(
      caseKeys,
      getStatusByType(ACTIVE_PROCESSING),
      VIVA_APPLICATION_LOCKED
    );
    expect(triggerEventMock).toHaveBeenCalledWith({
      ...lambdaInput.detail,
      caseStatusType: ACTIVE_PROCESSING,
      caseState: VIVA_APPLICATION_LOCKED,
    });
  });
});
