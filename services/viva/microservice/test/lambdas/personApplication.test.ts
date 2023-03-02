import { personApplication } from '../../src/lambdas/personApplication';

import type { LambdaRequest, Dependencies } from '../../src/lambdas/personApplication';
import type { VivaMyPagesVivaCase } from '../../../types/vivaMyPages';

const mockPersonalNumber = '199009123412';
const defaultVivaMyPages = {
  client: {
    pnumber: '19900912-3412',
  },
} as VivaMyPagesVivaCase;

function createInput(): LambdaRequest {
  return {
    detail: {
      user: {
        personalNumber: mockPersonalNumber,
      },
    },
  } as LambdaRequest;
}

function createDependencies(dependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    getMyPages: () => Promise.resolve(defaultVivaMyPages),
    getApplication: () =>
      Promise.resolve({
        workflowId: '123',
        period: {
          start: '2021-01-01',
          end: '2021-01-31',
        },
      }),
    triggerEvent: () => Promise.resolve(undefined),
    ...dependencies,
  };
}

it('successfully fetches MyPages info from Viva', async () => {
  const mockGetVivaPerson = jest.fn().mockResolvedValue(defaultVivaMyPages);
  const mockPutSuccessEvent = jest.fn();

  const result = await personApplication(
    createInput(),
    createDependencies({
      getMyPages: mockGetVivaPerson,
      triggerEvent: mockPutSuccessEvent,
    })
  );

  expect(result).toBe(true);
  expect(mockGetVivaPerson).toHaveBeenCalledWith(mockPersonalNumber);
  expect(mockPutSuccessEvent).toHaveBeenCalledWith({
    user: {
      personalNumber: mockPersonalNumber,
    },
    myPages: defaultVivaMyPages,
    application: {
      workflowId: '123',
      period: {
        start: '2021-01-01',
        end: '2021-01-31',
      },
    },
  });
});
