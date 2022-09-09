import { checkApplicationStatus, LambdaRequest } from '../../src/lambdas/applicationStatus';
import { VivaApplicationStatus } from '../../src/types/vivaMyPages';

const MOCK_INPUT: LambdaRequest = {
  detail: {
    personalNumber: '202001019999',
  },
};

const MOCK_STATUSES: VivaApplicationStatus[] = [
  {
    code: 1,
    desciption: 'hello world',
  },
];

function getStatus(): Promise<VivaApplicationStatus[]> {
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
