import { CaseAdministrator } from '../../src/types/caseItem';
import { syncOfficers } from '../../src/lambdas/syncOfficers';

import { VivaOfficer } from '../../src/types/vivaMyPages';

const defaultOfficers: VivaOfficer[] = [
  {
    mail: 'mail@test.com',
    name: 'testName',
    title: 'Socialsekreterare',
    type: 'officer',
    phone: null,
    typeenclair: '',
  },
];

const PK = 'USER#199001011234';
const SK = 'CASE#11111111-2222-3333-4444-555555555555';

it('successfully updates case with new officers', async () => {
  const expectedOfficers: CaseAdministrator[] = [
    {
      email: 'mail@test.com',
      name: 'testName',
      title: 'Socialsekreterare',
      phone: null,
      type: 'officer',
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
    getVivaOfficers: () => Promise.resolve({ officer: defaultOfficers }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedOfficers);
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
      getVivaOfficers: () => Promise.resolve({ officer: defaultOfficers }),
      updateCaseAdministrators: updateCaseOfficersMock,
    }
  );

  expect(result).toBeNull();
  expect(updateCaseOfficersMock).toHaveBeenCalledTimes(0);
});

it('updates the case with only allowed officers', async () => {
  const expectedOfficers: CaseAdministrator[] = [
    {
      email: 'mail@test.com',
      name: 'testName',
      title: 'Socialsekreterare',
      phone: null,
      type: 'officer',
    },
  ];
  const fetchedOfficers = [
    ...defaultOfficers,
    {
      ...defaultOfficers[0],
      type: 'Not Allowed type',
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
    getVivaOfficers: () => Promise.resolve({ officer: fetchedOfficers }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(true);
  expect(updateCaseOfficersMock).toHaveBeenCalledWith({ PK, SK }, expectedOfficers);
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
                        S: 'testName',
                      },
                      type: {
                        S: 'officer',
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
    getVivaOfficers: () => Promise.resolve({ officer: defaultOfficers }),
    updateCaseAdministrators: updateCaseOfficersMock,
  });

  expect(result).toBe(false);
  expect(updateCaseOfficersMock).toHaveBeenCalledTimes(0);
});
