import { main } from '../../lambdas/fetchReferenceCode';
import * as dynamoDb from '../../../../libs/dynamoDb';

jest.mock('../../../../libs/dynamoDb');

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockContext = {
  awsRequestId: 'xxxxx',
};

const mockUUID = '1a2b3c';
const mockEmail = 'test@test.com';
const mockPersonalNumber = '0101010101';

const mockDyanmoGetResponse = {
  Item: { uuid: mockUUID },
};

const mockDyanmoQueryResponse = {
  Count: 1,
  Items: [{ uuid: mockUUID }],
};

const mockDyanmoQueryNotFoundResponse = {
  Count: 0,
  Items: [],
};

const mockDyanmoGetNotFoundResponse = {
  Item: undefined,
};

const mockResponseBody = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    type: 'userFetchReferenceCode',
    referenceCode: mockUUID,
  },
};

const mock404body = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '404',
    code: '404',
    message: 'No user with that personal number or email found in the database.',
  },
};

const mock500body = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '500',
    code: '500',
    message: 'Internal server error',
  },
};

const mock400body = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '400',
    code: '400',
    message: 'Missing required parameter: "query"',
  },
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('gets reference code for email', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      query: mockEmail,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mockResponseBody),
    headers: mockHeaders,
    statusCode: 200,
  };

  dynamoDb.call.mockResolvedValueOnce(mockDyanmoQueryResponse);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).toHaveBeenCalledTimes(1);
});

it('gets reference code for personal number', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      query: mockPersonalNumber,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mockResponseBody),
    headers: mockHeaders,
    statusCode: 200,
  };

  dynamoDb.call.mockResolvedValueOnce(mockDyanmoGetResponse);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).toHaveBeenCalledTimes(1);
});

it('returns 404 for nonexistent email', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      query: mockEmail,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mock404body),
    headers: mockHeaders,
    statusCode: 404,
  };

  dynamoDb.call.mockResolvedValueOnce(mockDyanmoQueryNotFoundResponse);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).toHaveBeenCalledTimes(1);
});

it('returns 404 for nonexistent PN', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      query: mockPersonalNumber,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mock404body),
    headers: mockHeaders,
    statusCode: 404,
  };

  dynamoDb.call.mockResolvedValueOnce(mockDyanmoGetNotFoundResponse);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).toHaveBeenCalledTimes(1);
});

it('returns 500 when dyanmo throws error', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      query: mockPersonalNumber,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mock500body),
    headers: mockHeaders,
    statusCode: 500,
  };

  dynamoDb.call.mockRejectedValueOnce(new Error());

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).toHaveBeenCalledTimes(1);
});

it('returns 400 for bad request', async () => {
  expect.assertions(2);

  const mockEvent = {};

  const expectedResult = {
    body: JSON.stringify(mock400body),
    headers: mockHeaders,
    statusCode: 400,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(dynamoDb.call).not.toHaveBeenCalled();
});
