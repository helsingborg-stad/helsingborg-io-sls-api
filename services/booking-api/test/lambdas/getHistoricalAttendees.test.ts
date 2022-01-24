import { main } from '../../src/lambdas/getHistoricalAttendees';
import booking from '../../src/helpers/booking';

jest.mock('../../src/helpers/booking');

const { getHistoricalAttendees, getAdministratorDetails } = jest.mocked(booking);
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockContext = {
  awsRequestId: 'xxxxx',
};

const mockLookupResponse1 = {
  data: {
    data: {
      type: 'userdetails',
      id: 'id',
      attributes: {
        Email: 'outlook_1@helsingborg.se',
        DisplayName: 'Display Name 1',
        Department: 'Department 1',
        JobTitle: 'Job Title 1',
      },
    },
  },
};

const mockLookupResponse2 = {
  data: {
    data: {
      type: 'userdetails',
      id: 'id_2',
      attributes: {
        Email: 'outlook_2@helsingborg.se',
        DisplayName: 'Display Name 2',
        Department: 'Department 2',
        JobTitle: 'Job Title 2',
      },
    },
  },
};

const mockHistoricalResponse = {
  type: 'bookings',
  id: '123456789',
  attributes: [
    mockLookupResponse1.data.data.attributes.Email,
    mockLookupResponse2.data.data.attributes.Email,
  ],
};

const expectedData = {
  jsonapi: { version: '1.0' },
  data: {
    ...mockHistoricalResponse,
    attributes: [
      mockLookupResponse1.data.data.attributes,
      mockLookupResponse2.data.data.attributes,
    ],
  },
};

const expectedDataBadLookup = {
  jsonapi: { version: '1.0' },
  data: {
    ...mockHistoricalResponse,
    attributes: [
      { Email: mockLookupResponse1.data.data.attributes.Email },
      { Email: mockLookupResponse2.data.data.attributes.Email },
    ],
  },
};

const mockReferenceCode = '1a2bc3';
const mockStartTime = 'startTime';
const mockEndTime = 'mockEndTime';
let mockEvent: {
  pathParameters: {
    referenceCode?: string;
  };
  queryStringParameters: {
    startTime?: string;
    endTime?: string;
  };
};

beforeEach(() => {
  jest.resetAllMocks();

  mockEvent = {
    pathParameters: {
      referenceCode: mockReferenceCode,
    },
    queryStringParameters: {
      startTime: mockStartTime,
      endTime: mockEndTime,
    },
  };
});

it('gets historical attendees successfully', async () => {
  expect.assertions(3);

  const expectedResult = {
    body: JSON.stringify(expectedData),
    headers: mockHeaders,
    statusCode: 200,
  };

  getHistoricalAttendees.mockResolvedValueOnce({
    data: {
      data: mockHistoricalResponse,
    },
  });
  getAdministratorDetails
    .mockResolvedValueOnce(mockLookupResponse1)
    .mockResolvedValueOnce(mockLookupResponse2);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(1);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledWith({
    referenceCode: mockReferenceCode,
    startTime: mockStartTime,
    endTime: mockEndTime,
  });
});

it('returns failure if "referenceCode" is not provided as path parameter', async () => {
  expect.assertions(2);

  mockEvent.pathParameters.referenceCode = undefined;
  const statusCode = 403;
  const message = 'Missing required parameter: "referenceCode"';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message,
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(0);
});

it('returns failure if one of required query strings parameters does not exist', async () => {
  expect.assertions(2);

  mockEvent.queryStringParameters.startTime = undefined;

  const statusCode = 403;
  const message = 'Missing one or more required query string parameters: "startTime", "endTime"';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message,
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(0);
});

it('returns failure if datatorget request fails', async () => {
  expect.assertions(2);

  const statusCode = 500;
  const message = 'error';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '500',
        code: '500',
        message,
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  getHistoricalAttendees.mockRejectedValueOnce({
    status: statusCode,
    message,
  });

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(1);
});

it('returns fallback if datatorget lookup fails', async () => {
  expect.assertions(3);

  const expectedResult = {
    body: JSON.stringify(expectedDataBadLookup),
    headers: mockHeaders,
    statusCode: 200,
  };

  getHistoricalAttendees.mockResolvedValueOnce({
    data: {
      data: mockHistoricalResponse,
    },
  });
  getAdministratorDetails.mockRejectedValue(undefined);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(getHistoricalAttendees).toHaveBeenCalledTimes(1);
  expect(getHistoricalAttendees).toHaveBeenCalledWith({
    referenceCode: mockReferenceCode,
    startTime: mockStartTime,
    endTime: mockEndTime,
  });
});

it('caches datatorget lookup between invocations', async () => {
  expect.assertions(5);

  const expectedResult = {
    body: JSON.stringify(expectedData),
    headers: mockHeaders,
    statusCode: 200,
  };

  getHistoricalAttendees.mockResolvedValue({
    data: {
      data: mockHistoricalResponse,
    },
  });
  getAdministratorDetails
    .mockResolvedValueOnce(mockLookupResponse1)
    .mockResolvedValueOnce(mockLookupResponse2)
    .mockRejectedValue(undefined);

  const result1 = await main(mockEvent, mockContext);
  const result2 = await main(mockEvent, mockContext);

  expect(result1).toEqual(expectedResult);
  expect(result2).toEqual(expectedResult);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(2);
  expect(booking.getHistoricalAttendees).toHaveBeenCalledWith({
    referenceCode: mockReferenceCode,
    startTime: mockStartTime,
    endTime: mockEndTime,
  });
  expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(2);
});
