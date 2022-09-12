import { getStatusByType } from '../../../libs/caseStatuses';
import {
  COMPLETIONS_DUE_DATE_PASSED,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
} from '../../../libs/constants';
import {
  checkCompletionsDueDate,
  Dependencies,
  LambdaRequest,
} from '../../src/lambdas/checkCompletionsDueDate';
import type { CaseItem } from '../../src/types/caseItem';

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    getCase: () => Promise.resolve({} as CaseItem),
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
      caseKeys: {
        PK: '123',
        SK: 'ABC',
      },
    },
  } as LambdaRequest;
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue({
      details: {
        completions: {
          isDueDateExpired: true,
        },
      },
    }),
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
      caseKeys: {
        PK: '123',
        SK: 'ABC',
      },
    },
  } as LambdaRequest;
  const updateCaseMock = jest.fn();
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue({
      details: {
        completions: {
          isDueDateExpired: true,
        },
      },
    }),
    updateCase: updateCaseMock,
  });
  const result = await checkCompletionsDueDate(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});

it('returns true if the case attribute details.completions is null', async () => {
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
    getCase: jest.fn().mockResolvedValue({
      details: {
        completions: null,
      },
    }),
    updateCase: updateCaseMock,
  });
  const result = await checkCompletionsDueDate(lambdaInput, dependencies);

  expect(result).toBe(true);
  expect(dependencies.updateCase).toHaveBeenCalledTimes(0);
});
