// import { InternalServerError } from '@helsingborg-stad/npm-api-error-handling/src/errors';

import searchAdministrators from '../../helpers/searchAdministrators';
import params from '../../../../libs/params';
import { call } from '../../../../libs/request';

jest.mock('../../../../libs/params');
jest.mock('../../../../libs/request');

const mockApiKey = 'mockKey';
const mockOutlookSearchEndpoint = 'mockEndpoint';

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

  params.read.mockResolvedValueOnce({
    outlookSearchEndpoint: mockOutlookSearchEndpoint,
    apiKey: mockApiKey,
  });

  call.mockImplementation(jest.fn().mockRejectedValueOnce(datatorgetError));

  try {
    await searchAdministrators({ mailbox: 'bla@helsingborg.se' });
  } catch (error) {
    expect(error).toEqual(datatorgetError);
  }
});

it('returns a successful response when receiving a successful response from an API', async () => {
  // TODO: 1. Kolla response från datatorget.
});
