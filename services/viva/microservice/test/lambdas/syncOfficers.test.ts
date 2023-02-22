import type { CaseItem, CaseAdministrator } from '../../src/types/caseItem';
import { syncOfficers } from '../../src/lambdas/syncOfficers';

import type { VivaOfficer } from '../../src/types/vivaMyPages';
import { VivaOfficerType } from '../../src/types/vivaMyPages';

function makeVivaOfficer(partialVivaOfficer: Partial<VivaOfficer> = {}) {
  return {
    mail: 'mail@test.com',
    name: 'CN=Karl Karlsson/OU=extern/O=ASDF',
    title: 'Socialsekreterare',
    type: VivaOfficerType.Officer,
    phone: null,
    typeenclair: '',
    ...partialVivaOfficer,
  };
}

const PK = 'USER#199001011234';
const SK = 'CASE#11111111-2222-3333-4444-555555555555';

const mockCase = {
  PK,
  SK,
  details: {
    administrators: [],
  },
} as unknown as CaseItem;

it('successfully updates case with new officers', async () => {
  const expectedCaseAdministrators: CaseAdministrator[] = [
    {
      email: 'mail@test.com',
      name: 'Karl Karlsson',
      title: 'Socialsekreterare',
      phone: null,
      type: VivaOfficerType.Officer,
    },
  ];
  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);
  const lambdaInput = {
    detail: {
      keys: {
        PK,
        SK,
      },
    },
  };

  const result = await syncOfficers(lambdaInput, {
    getOfficers: () => Promise.resolve([makeVivaOfficer()]),
    getCase: () => Promise.resolve(mockCase),
    updateCase: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedCaseAdministrators);
});

it('updates the case with only allowed officers', async () => {
  const expectedCaseAdministrators: CaseAdministrator[] = [
    {
      email: 'mail@test.com',
      name: 'Karl Karlsson',
      title: 'Socialsekreterare',
      phone: null,
      type: VivaOfficerType.Officer,
    },
  ];
  const lambdaInput = {
    detail: {
      keys: {
        PK,
        SK,
      },
    },
  };

  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await syncOfficers(lambdaInput, {
    getOfficers: () =>
      Promise.resolve([makeVivaOfficer(), makeVivaOfficer({ type: 'Not allowed type' })]),
    getCase: () => Promise.resolve(mockCase),
    updateCase: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedCaseAdministrators);
});

it('does not update case if officers are the same in viva as in the case', async () => {
  const mockCase = {
    PK,
    SK,
    details: {
      administrators: [
        {
          email: 'mail@test.com',
          name: 'Karl Karlsson',
          title: 'Socialsekreterare',
          phone: null,
          type: VivaOfficerType.Officer,
        },
      ],
    },
  } as unknown as CaseItem;

  const lambdaInput = {
    detail: {
      keys: {
        PK,
        SK,
      },
    },
  };
  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await syncOfficers(lambdaInput, {
    getOfficers: () => Promise.resolve([makeVivaOfficer()]),
    getCase: () => Promise.resolve(mockCase),
    updateCase: updateCaseOfficersMock,
  });

  expect(result).toBeTruthy();
  expect(updateCaseOfficersMock).toHaveBeenCalledTimes(0);
});
