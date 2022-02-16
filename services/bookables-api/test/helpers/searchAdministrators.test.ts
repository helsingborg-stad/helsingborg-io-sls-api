import searchAdministrators from '../../src/helpers/searchAdministrators';
import params from '../../src/libs/params';
import * as request from '../../src/libs/request';

jest.mock('../../src/libs/params');
jest.mock('../../src/libs/request');

const mockApiKey = 'mockKey';
const mockOutlookSearchEndpoint = 'mockEndpoint';
const { read } = jest.mocked(params);
const { call } = jest.mocked(request);

it('throws if it receives an error when making request against datatorget API', async () => {
  expect.assertions(1);

  const datatorgetError = {
    jsonapi: {
      version: '1.0',
    },
    errors: [
      {
        status: '500',
        title: 'some title',
      },
    ],
  };

  read.mockResolvedValueOnce({
    outlookSearchEndpoint: mockOutlookSearchEndpoint,
    apiKey: mockApiKey,
  });

  call.mockImplementation(jest.fn().mockRejectedValueOnce(datatorgetError));

  try {
    await searchAdministrators({ mailbox: 'bla@helsingborg.se' });
  } catch (error) {
    // eslint-disable-next-line jest/no-conditional-expect
    expect(error).toEqual(datatorgetError);
  }
});

it('returns a successful response', async () => {
  expect.assertions(1);

  read.mockResolvedValueOnce({
    outlookSearchEndpoint: mockOutlookSearchEndpoint,
    apiKey: mockApiKey,
  });

  const datatorgetResponse = {
    jsonapi: {
      version: '1.0',
    },
    data: {
      data: {
        type: 'bookings',
        id: 'xxxx',
        attributes: ['email_1@email.com', 'email_2@email.com'],
      },
    },
  };

  call.mockImplementation(jest.fn().mockResolvedValueOnce(datatorgetResponse));

  const result = await searchAdministrators({ mailbox: 'bla@helsingborg.se' });

  expect(result).toEqual(datatorgetResponse);
});
