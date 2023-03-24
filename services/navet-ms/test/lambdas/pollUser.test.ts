import { pollUser } from '../../src/lambdas/pollUser';
import type { Input, Dependencies } from '../../src/lambdas/pollUser';
import type { CaseUser } from '../../src/helpers/types';

const firstName = 'Petronella';
const lastName = 'Malteskog';
const personalNumber = '198602102389';
const city = 'Stockholm';
const postalCode = '12345';
const street = 'Kungsgatan 1';

const mockUser: CaseUser = {
  firstName,
  lastName,
  civilStatus: 'OG',
  personalNumber,
  address: {
    city,
    postalCode,
    street,
  },
};

function createDependencies(dependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    provider: {
      getUserInfo: () => Promise.resolve(mockUser),
    },
    triggerEvent: () => Promise.resolve(),
    ...dependencies,
  };
}

function createInput(params: Partial<Input> = {}): Input {
  return {
    detail: {
      user: {
        personalNumber,
      },
    },
    ...params,
  };
}

it('successfully fetches a navet user', async () => {
  const eventMock = jest.fn();

  const result = await pollUser(
    createInput(),
    createDependencies({
      triggerEvent: eventMock,
    })
  );

  expect(result).toBe(true);
  expect(eventMock).toHaveBeenCalledWith(
    {
      user: mockUser,
    },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});

it('successfully fetches a navet user without address', async () => {
  const eventMock = jest.fn();

  const result = await pollUser(
    createInput(),
    createDependencies({
      provider: {
        getUserInfo: () =>
          Promise.resolve({
            ...mockUser,
            address: null,
          }),
      },
      triggerEvent: eventMock,
    })
  );

  expect(result).toBe(true);
  expect(eventMock).toHaveBeenCalledWith(
    {
      user: {
        ...mockUser,
        address: null,
      },
    },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});
