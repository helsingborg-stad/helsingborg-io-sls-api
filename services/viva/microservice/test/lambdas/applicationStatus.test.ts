import { checkApplicationStatus } from '../../src/lambdas/applicationStatus';
import type { LambdaRequest } from '../../src/lambdas/applicationStatus';
import type { VivaApplicationsStatusItem } from '../../src/types/vivaApplicationsStatus';

const MOCK_INPUT = {
  detail: {
    user: {
      personalNumber: '202001019999',
    },
  },
} as LambdaRequest;

const MOCK_STATUSES: VivaApplicationsStatusItem[] = [
  {
    code: 1,
    description: 'hello world',
  },
];

function getStatus(): Promise<VivaApplicationsStatusItem[]> {
  return Promise.resolve(MOCK_STATUSES);
}

describe('applicationStatus', () => {
  const mockEvent = jest.fn();
  it('returns true on success', async () => {
    const result = await checkApplicationStatus(MOCK_INPUT, {
      getStatus,
      triggerEvent: mockEvent,
    });
    expect(result).toBe(true);
  });

  it('puts out the status list', async () => {
    await checkApplicationStatus(MOCK_INPUT, {
      getStatus,
      triggerEvent: mockEvent,
    });

    expect(mockEvent).toHaveBeenCalledWith({
      user: MOCK_INPUT.detail.user,
      status: MOCK_STATUSES,
    });
  });
});
