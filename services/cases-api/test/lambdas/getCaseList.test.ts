import { getCaseList } from '../../src/lambdas/getCaseList';

import type {
  Dependencies,
  CaseWithOmittedProperties,
  FunctionResponse,
} from '../../src/lambdas/getCaseList';

import type { CaseItem } from '../../src/types/case';

const defaultCases = [{ id: '1' }, { id: '2' }] as CaseWithOmittedProperties[];
const defaultPersonalNumber = '1234567890';

function getDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    putSuccessEvent: jest.fn(),
    getCases: () => Promise.resolve(defaultCases as CaseItem[]),
    ...partialDependencies,
  };
}

function createFunctionResponse(cases: CaseWithOmittedProperties[]): FunctionResponse {
  return {
    attributes: {
      cases,
    },
  };
}

it('returns a list of cases', async () => {
  const getCasesMock = jest.fn().mockResolvedValueOnce(defaultCases);

  const result = await getCaseList(
    {
      personalNumber: defaultPersonalNumber,
    },
    getDependencies({
      getCases: getCasesMock,
    })
  );

  expect(getCasesMock).toHaveBeenCalledWith(defaultPersonalNumber);
  expect(result).toEqual(createFunctionResponse(defaultCases));
});

it('removes "PK", "SK", "GSI1" and "pdf" properties from cases', async () => {
  const getCasesMock = jest.fn().mockResolvedValueOnce([
    {
      id: 'id',
      PK: '1',
      SK: '2',
      GSI1: '3',
      pdf: '4',
    },
  ]);

  const result = await getCaseList(
    {
      personalNumber: defaultPersonalNumber,
    },
    getDependencies({
      getCases: getCasesMock,
    })
  );

  expect(getCasesMock).toHaveBeenCalledWith(defaultPersonalNumber);
  expect(result).toEqual(createFunctionResponse([{ id: 'id' }] as CaseWithOmittedProperties[]));
});
