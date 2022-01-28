import { main } from '../../src/lambdas/getHistoricalAttendees';
import booking from '../../src/helpers/booking';
import helperMapAdminDetails from '../../src/helpers/mapAdminDetails';

jest.mock('../../src/helpers/booking');

const { getHistoricalAttendees } = jest.mocked(booking);
const mapAdminDetails = jest.mocked(helperMapAdminDetails);
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockContext = {
  awsRequestId: 'xxxxx',
};

const mockEmails = ['outlook_1@helsingborg.se', 'outlook_2@helsingborg.se'];

const mockHistoricalResponse = {
  type: 'bookings',
  id: '123456789',
  attributes: mockEmails,
};

const mockAD1 = {
  Email: 'outlook_1@helsingborg.se',
  DisplayName: 'Display Name 1',
  Department: 'Department 1',
  JobTitle: 'Job Title 1',
};

const mockAD2 = {
  Email: 'outlook_2@helsingborg.se',
  DisplayName: 'Display Name 2',
  Department: 'Department 2',
  JobTitle: 'Job Title 2',
};

const mockMappings = {
  [mockAD1.Email]: mockAD1,
  [mockAD2.Email]: mockAD2,
};

const expectedData = {
  jsonapi: { version: '1.0' },
  data: {
    ...mockHistoricalResponse,
    attributes: [mockAD1, mockAD2],
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
  mapAdminDetails.mockResolvedValue(mockMappings);

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
