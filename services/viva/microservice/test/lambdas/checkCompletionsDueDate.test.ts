import { getStatusByType } from '../../../libs/caseStatuses';
import {
  COMPLETIONS_DUE_DATE_PASSED,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
} from '../../../libs/constants';
import { checkCompletionsDueDate } from '../../src/lambdas/checkCompletionsDueDate';
import type { Dependencies, LambdaRequest } from '../../src/lambdas/checkCompletionsDueDate';

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    updateCase: () => Promise.resolve(),
    ...partialDependencies,
  };
}

it('updates the case if completions due date has passed', async () => {
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
      workflowCompletions: {
        isDueDateExpired: true,
      },
      caseKeys: {
        PK: '123',
        SK: 'ABC',
      },
    },
  } as LambdaRequest;
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies({
    updateCase: updateCaseMock,
  });
  const result = await checkCompletionsDueDate(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledWith(
    { PK: '123', SK: 'ABC' },
    {
      newStatus: getStatusByType(ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA),
      newState: COMPLETIONS_DUE_DATE_PASSED,
    }
  );
});

it('returns true if viva application status code list is invalid', async () => {
  const lambdaInput = {
    detail: {
      vivaApplicantStatusCodeList: [
        {
          code: 1,
        },
        {
          code: 2,
        },
        {
          code: 3,
        },
      ],
      workflowCompletions: {
        isDueDateExpired: false,
      },
      caseKeys: {
        PK: '123',
        SK: 'ABC',
      },
    },
  } as LambdaRequest;
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies({
    updateCase: updateCaseMock,
  });
  const result = await checkCompletionsDueDate(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});

it('returns true if isDueDateExpired is undefined', async () => {
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
      caseKeys: {
        PK: '123',
        SK: 'ABC',
      },
    },
  } as LambdaRequest;
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies({
    updateCase: updateCaseMock,
  });
  const result = await checkCompletionsDueDate(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});
