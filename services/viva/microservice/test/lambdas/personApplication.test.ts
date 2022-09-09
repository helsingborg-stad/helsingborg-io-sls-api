import { personApplication } from '../../src/lambdas/personApplication';

import type { LambdaRequest, Dependencies } from '../../src/lambdas/personApplication';
import type { CaseUser } from '../../../types/caseItem';
import type {
  VivaMyPagesPersonApplication,
  VivaMyPagesPersonCase,
} from '../../../types/vivaMyPages';

const mockPersonalNumber = '1990091234';
const defaultVivaMyPages = {
  case: {
    client: {
      pnumber: mockPersonalNumber,
    },
  } as VivaMyPagesPersonCase,
  application: {} as VivaMyPagesPersonApplication,
};

function createInput(): LambdaRequest {
  return {
    detail: {
      user: {
        personalNumber: mockPersonalNumber,
      } as CaseUser,
    },
  };
}

function createDependencies(dependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    getVivaPerson: () => Promise.resolve(defaultVivaMyPages),
    putSuccessEvent: () => Promise.resolve(undefined),
    ...dependencies,
  };
}

it('successfully fetches person from viva', async () => {
  const mockGetVivaPerson = jest.fn().mockResolvedValue(defaultVivaMyPages);
  const mockPutSuccessEvent = jest.fn();

  const result = await personApplication(
    createInput(),
    createDependencies({
      getVivaPerson: mockGetVivaPerson,
      putSuccessEvent: mockPutSuccessEvent,
    })
  );

  expect(result).toBe(true);
  expect(mockGetVivaPerson).toHaveBeenCalledWith(mockPersonalNumber);
  expect(mockPutSuccessEvent).toHaveBeenCalledWith({
    clientUser: {
      personalNumber: mockPersonalNumber,
    },
    vivaPersonDetail: defaultVivaMyPages,
  });
});
