import { personApplicationStatus } from '../../src/lambdas/personApplicationStatus';

import type { LambdaRequest } from '../../src/lambdas/personApplicationStatus';
import type { VivaApplicationsStatusItem } from '../../src/types/vivaApplicationsStatus';

function createInput(status: VivaApplicationsStatusItem[]): LambdaRequest {
  return {
    detail: {
      user: {
        personalNumber: '111122331111',
      },
      status: [...status],
    },
  } as LambdaRequest;
}

describe('personApplicationStatus', () => {
  it('successfully put recurring open event', async () => {
    const mockRecurringOpenEvent = jest.fn();

    const result = await personApplicationStatus(
      createInput([
        {
          code: 1,
          description: 'hello dude!',
        },
        {
          code: 128,
          description: 'hello dude!',
        },
        {
          code: 256,
          description: 'hello dude!',
        },
        {
          code: 512,
          description: 'hello dude!',
        },
      ]),
      {
        triggerRecurringOpenEvent: mockRecurringOpenEvent,
        triggerNewOpenEvent: () => Promise.resolve(),
      }
    );

    expect(result).toBe(true);
    expect(mockRecurringOpenEvent).toHaveBeenCalledTimes(1);
  });

  it('successfully put new open event', async () => {
    const mockNewOpenEvent = jest.fn();

    const result = await personApplicationStatus(
      createInput([
        {
          code: 1,
          description: 'hello dude!',
        },
      ]),
      {
        triggerRecurringOpenEvent: () => Promise.resolve(),
        triggerNewOpenEvent: mockNewOpenEvent,
      }
    );

    expect(result).toBe(true);
    expect(mockNewOpenEvent).toHaveBeenCalledTimes(1);
  });

  it('does not put event when status code is not open period', async () => {
    const mockRecurringOpenEvent = jest.fn();
    const mockNewOpenEvent = jest.fn();

    const result = await personApplicationStatus(
      createInput([
        {
          code: 128,
          description: 'hello dude!',
        },
        {
          code: 256,
          description: 'hello dude!',
        },
        {
          code: 512,
          description: 'hello dude!',
        },
      ]),
      {
        triggerRecurringOpenEvent: mockRecurringOpenEvent,
        triggerNewOpenEvent: mockNewOpenEvent,
      }
    );

    expect(result).toBe(true);
    expect(mockRecurringOpenEvent).toHaveBeenCalledTimes(0);
    expect(mockNewOpenEvent).toHaveBeenCalledTimes(0);
  });
});
