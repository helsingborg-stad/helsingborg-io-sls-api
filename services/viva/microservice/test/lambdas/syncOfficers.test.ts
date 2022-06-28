import { CaseAdministrator } from '../../src/types/caseItem';
import { syncOfficers } from '../../src/lambdas/syncOfficers';

import { VivaOfficer, VivaOfficerType } from '../../src/types/vivaMyPages';

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
      dynamodb: {
        NewImage: {
          PK: {
            S: PK,
          },
          SK: {
            S: SK,
          },
          details: {
            M: {
              administrators: {
                L: [],
              },
            },
          },
        },
      },
    },
  };

  const result = await syncOfficers(lambdaInput, {
    getVivaOfficers: () => Promise.resolve({ officer: [makeVivaOfficer()] }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedCaseAdministrators);
});

it('returns null if `NewImage` property is undefined', async () => {
  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await syncOfficers(
    {
      detail: {
        dynamodb: {
          NewImage: undefined,
        },
      },
    },
    {
      getVivaOfficers: () => Promise.resolve({ officer: [makeVivaOfficer()] }),
      updateCaseAdministrators: updateCaseOfficersMock,
    }
  );

  expect(result).toBeNull();
  expect(updateCaseOfficersMock).toHaveBeenCalledTimes(0);
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
      dynamodb: {
        NewImage: {
          PK: {
            S: PK,
          },
          SK: {
            S: SK,
          },
          details: {
            M: {
              administrators: {
                L: [],
              },
            },
          },
        },
      },
    },
  };
  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await syncOfficers(lambdaInput, {
    getVivaOfficers: () =>
      Promise.resolve({
        officer: [makeVivaOfficer(), makeVivaOfficer({ type: 'Not allowed type' })],
      }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedCaseAdministrators);
});

it('does not update case if officers are the same in viva as in the case', async () => {
  const lambdaInput = {
    detail: {
      dynamodb: {
        NewImage: {
          PK: {
            S: PK,
          },
          SK: {
            S: SK,
          },
          details: {
            M: {
              administrators: {
                L: [
                  {
                    M: {
                      name: {
                        S: 'Karl Karlsson',
                      },
                      type: {
                        S: VivaOfficerType.Officer,
                      },
                      title: {
                        S: 'Socialsekreterare',
                      },
                      email: {
                        S: 'mail@test.com',
                      },
                      phone: {
                        NULL: true,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  };
  const updateCaseOfficersMock = jest.fn().mockResolvedValueOnce(undefined);

  const result = await syncOfficers(lambdaInput, {
    getVivaOfficers: () => Promise.resolve({ officer: [makeVivaOfficer()] }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(false);
  expect(updateCaseOfficersMock).toHaveBeenCalledTimes(0);
});
