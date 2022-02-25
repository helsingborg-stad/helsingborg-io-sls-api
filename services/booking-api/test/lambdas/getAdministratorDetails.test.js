import { main } from '../../src/lambdas/getAdministratorDetails';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockContext = {
  awsRequestId: 'xxxxx',
};

const mockEmail = 'mock@email.com';
const mockBadEmail = 'notAnEmail';
const mockJobTitle = 'Mock job title';
const mockDepartment = 'Mock department';
const mockDisplayName = 'Mock Name';

const mockAttributes = {
  Email: mockEmail,
  JobTitle: mockJobTitle,
  Department: mockDepartment,
  DisplayName: mockDisplayName,
};

const mockDatatorgetResponse = {
  data: {
    data: {
      type: 'userdetails',
      id: mockEmail,
      attributes: mockAttributes,
    },
  },
};

const mockResponse = {
  jsonapi: {
    version: '1.0',
  },
  data: mockDatatorgetResponse.data.data,
};

const mockNoEmailBody = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '400',
    code: '400',
    message: 'Missing required parameter: "email"',
  },
};

const mockBadEmailBody = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '400',
    code: '400',
    message: 'Malformed email',
  },
};

const mock500Body = {
  jsonapi: {
    version: '1.0',
  },
  data: {
    status: '500',
    code: '500',
    message: 'Internal server error',
  },
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('retrieves AD details successfully', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      email: mockEmail,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mockResponse),
    headers: mockHeaders,
    statusCode: 200,
  };

  booking.getAdministratorDetails.mockResolvedValueOnce(mockDatatorgetResponse);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).toHaveBeenCalledTimes(1);
});

it('returns 400 if no email in request', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {},
  };

  const expectedResult = {
    body: JSON.stringify(mockNoEmailBody),
    headers: mockHeaders,
    statusCode: 400,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).not.toHaveBeenCalled();
});

it('returns 400 if bad email in request', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      email: mockBadEmail,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mockBadEmailBody),
    headers: mockHeaders,
    statusCode: 400,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).not.toHaveBeenCalled();
});

it('returns 500 if datatorget request fails', async () => {
  expect.assertions(2);

  const mockEvent = {
    pathParameters: {
      email: mockEmail,
    },
  };

  const expectedResult = {
    body: JSON.stringify(mock500Body),
    headers: mockHeaders,
    statusCode: 500,
  };

  booking.getAdministratorDetails.mockRejectedValueOnce({
    status: 500,
    message: 'Internal server error',
  });

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).toHaveBeenCalledTimes(1);
});
