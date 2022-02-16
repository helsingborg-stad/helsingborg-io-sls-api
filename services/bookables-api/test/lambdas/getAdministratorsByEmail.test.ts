import { main } from '../../src/lambdas/getAdministratorsByEmail';
import searchAdministrators from '../../src/helpers/searchAdministrators';
import { getBookables } from '../../src/helpers/bookables';

jest.mock('../../src/helpers/searchAdministrators');
jest.mock('../../src/helpers/bookables');

const mockAdministrators = ['administrator@helsingborg.se', 'administrator_2@helsingborg.se'];
const email = 'mock@helsingborg.se';
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

let mockEvent: { pathParameters: { email?: string } };
beforeEach(() => {
  mockEvent = {
    pathParameters: {
      email,
    },
  };
});

beforeEach(() => {
  jest.resetAllMocks();
});

it('fetches administrators by email successfully', async () => {
  expect.assertions(3);

  (getBookables as jest.Mock).mockResolvedValueOnce([
    {
      sharedMailbox: email,
    },
  ]);
  (searchAdministrators as jest.Mock).mockResolvedValueOnce({
    data: {
      data: {
        attributes: mockAdministrators,
      },
    },
  });

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        attributes: mockAdministrators,
      },
    }),
    headers: mockHeaders,
    statusCode: 200,
  };

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(searchAdministrators).toHaveBeenCalledWith({ email });
  expect(searchAdministrators).toHaveBeenCalledTimes(1);
});

it('returns a failure when required parameter is not provided in the event', async () => {
  expect.assertions(2);

  const event = {
    pathParameters: {},
  };
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: { status: '403', code: '403', message: 'Missing required parameter "email"' },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main(event);

  expect(result).toEqual(expectedResult);
  expect(searchAdministrators).toHaveBeenCalledTimes(0);
});

it('returns a failure if "searchAdministrators" function fails', async () => {
  expect.assertions(2);

  (getBookables as jest.Mock).mockResolvedValueOnce([
    {
      sharedMailbox: email,
    },
  ]);

  const message = 'something fishy';
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: { status: '500', code: '500', message },
    }),
    headers: mockHeaders,
    statusCode: 500,
  };

  (searchAdministrators as jest.Mock).mockRejectedValueOnce({ status: 500, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(searchAdministrators).toHaveBeenCalledTimes(1);
});

it('returns a failure if provided email does not exists', async () => {
  expect.assertions(2);

  (getBookables as jest.Mock).mockResolvedValueOnce([
    {
      sharedMailbox: 'mail that does not exist',
    },
  ]);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: { status: '404', code: '404', message: 'Email does not exist' },
    }),
    headers: mockHeaders,
    statusCode: 404,
  };

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(searchAdministrators).toHaveBeenCalledTimes(0);
});
