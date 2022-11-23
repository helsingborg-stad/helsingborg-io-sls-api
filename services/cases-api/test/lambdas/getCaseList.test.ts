import { getCaseList } from '../../src/lambdas/getCaseList';

import type { Dependencies, Case, FunctionResponse } from '../../src/lambdas/getCaseList';

const defaultCases = [{ id: '1' }, { id: '2' }] as Case[];
const defaultPersonalNumber = '1234567890';

function getDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    putSuccessEvent: jest.fn(),
    getCases: () => Promise.resolve(defaultCases),
    ...partialDependencies,
  };
}

function createFunctionResponse(cases: Case[]): FunctionResponse {
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

it('removes cases without "PK", "SK", "GSI1", "PDF" properties', async () => {
  const getCasesMock = jest.fn().mockResolvedValueOnce([
    {
      id: 'id',
      PK: '1',
      SK: '2',
      GSI1: '3',
      PDF: '4',
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
  expect(result).toEqual(createFunctionResponse([{ id: 'id' }]));
});
