import { checkApplicationStatus, LambdaRequest } from '../../src/lambdas/applicationStatus';
import { VivaApplicationsStatusItem } from '../../src/types/vivaApplicationsStatus';

const MOCK_INPUT: LambdaRequest = {
  detail: {
    personalNumber: '202001019999',
  },
};

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
  it('returns true on success', async () => {
    const result = await checkApplicationStatus(MOCK_INPUT, {
      getStatus,
      putSuccessEvent: jest.fn(),
    });
    expect(result).toBe(true);
  });

  it('puts out the status list', async () => {
    const successEvent = jest.fn();

    await checkApplicationStatus(MOCK_INPUT, {
      getStatus,
      putSuccessEvent: successEvent,
    });

    expect(successEvent).toHaveBeenCalledWith({ user: MOCK_INPUT.detail, status: MOCK_STATUSES });
  });
});
