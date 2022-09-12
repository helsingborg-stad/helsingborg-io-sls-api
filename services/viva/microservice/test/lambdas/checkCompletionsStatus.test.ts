import {
  checkCompletionsStatus,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/checkCompletionsStatus';

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    putCompletionsRequiredEvent: () => Promise.resolve(),
    putSuccessEvent: () => Promise.resolve(),
    ...partialDependencies,
  };
}

it('puts success event when Viva status is NOT completions', async () => {
  const lambdaInput = {
    detail: {
      vivaApplicantStatusCodeList: [
        {
          code: 128,
        },
        {
          code: 256,
        },
        {
          code: 512,
        },
      ],
    },
  } as LambdaRequest;
  const putSuccessEventMock = jest.fn();
  const dependencies = createDependencies({ putSuccessEvent: putSuccessEventMock });
  const result = await checkCompletionsStatus(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.putSuccessEvent).toHaveBeenCalled();
});

it('puts required event when Viva status IS completions', async () => {
  const lambdaInput = {
    detail: {
      vivaApplicantStatusCodeList: [
        {
          code: 64,
        },
        {
          code: 128,
        },
        {
          code: 256,
        },
        {
          code: 512,
        },
      ],
    },
  } as LambdaRequest;
  const putCompletionsRequiredEventMock = jest.fn();
  const dependencies = createDependencies({
    putCompletionsRequiredEvent: putCompletionsRequiredEventMock,
  });
  const result = await checkCompletionsStatus(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.putCompletionsRequiredEvent).toHaveBeenCalled();
});
