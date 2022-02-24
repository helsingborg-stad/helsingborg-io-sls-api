// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/create';
import booking, { BookingSearchResponse } from '../../src/helpers/booking';
import getTimeSpans from '../../src/libs/getTimeSpans';
import { areAllAttendeesAvailable } from '../../src/helpers/isTimeSpanValid';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/libs/getTimeSpans');
jest.mock('../../src/helpers/isTimeSpanValid');

const { search, create } = jest.mocked(booking);
const mockedGetTimeSpans = jest.mocked(getTimeSpans);
const mockedAreAllAttendeesAvailable = jest.mocked(areAllAttendeesAvailable);

const mockBody = {
  requiredAttendees: ['outlook.user@helsingborg.se'],
  optionalAttendees: [],
  startTime: '2021-05-30T10:00:00',
  endTime: '2021-05-30T11:00:00',
  subject: 'economy',
  body: 'htmltext',
  location: 'secret location',
  referenceCode: 'code1234',
};
const mockContext = {
  awsRequestId: '123',
};
const mockEvent = {
  body: JSON.stringify(mockBody),
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};
const getTimeSpansResponse = { mockAttendee: ['FAKE DATA'] };

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates a booking successfully', async () => {
  expect.assertions(2);

  const searchResponseData: BookingSearchResponse['data'] = {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [
            {
              Type: 'Required',
              Status: 'Declined',
            },
          ],
        },
      ],
    },
  };
  const responseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        BookingId: '123456789',
      },
    },
  };
  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { bookingId: '123456789' } }),
    headers: mockHeaders,
    statusCode: 200,
  };

  search.mockResolvedValueOnce({ data: searchResponseData });
  create.mockResolvedValueOnce({ data: responseData });
  mockedGetTimeSpans.mockResolvedValueOnce({ data: getTimeSpansResponse });
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.create).toHaveBeenCalledWith(mockBody);
});

it('throws when booking.create fails', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];
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

  search.mockResolvedValueOnce({ data: { data: { attributes: [] } } });
  create.mockRejectedValueOnce({ status: statusCode, message });
  mockedGetTimeSpans.mockResolvedValueOnce({ data: getTimeSpansResponse });
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
});

it('returns error when required parameters does not exists in event', async () => {
  expect.assertions(2);

  const body = JSON.stringify({
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
  });

  const errorMessage =
    'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"';

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message: errorMessage,
      },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main({ body }, mockContext);

  expect(result).toEqual(expectedResult);
  expect(booking.create).toHaveBeenCalledTimes(0);
});

it('returns failure when timespan does not exist', async () => {
  expect.assertions(1);

  const statusCode = 403;
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message: 'No timeslot exists in the given interval',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  mockedGetTimeSpans.mockResolvedValueOnce({ data: getTimeSpansResponse });
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(false);

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
});

it('returns failure when timeslot is already taken', async () => {
  expect.assertions(1);

  const searchResponseData = {
    data: {
      attributes: [
        {
          BookingId: '123456789',
          Attendees: [
            {
              Type: 'Required',
              Status: 'Not declined',
            },
          ],
        },
      ],
    },
  };

  const statusCode = 403;
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message: 'Timeslot not available for booking',
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  mockedGetTimeSpans.mockResolvedValueOnce({ data: getTimeSpansResponse });
  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);
  search.mockResolvedValueOnce({ data: searchResponseData });

  const result = await main(mockEvent, mockContext);

  expect(result).toEqual(expectedResult);
});
