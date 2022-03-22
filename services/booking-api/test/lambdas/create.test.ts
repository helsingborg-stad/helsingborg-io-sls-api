// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('@helsingborg-stad/npm-api-error-handling/assets/errorMessages');

import { main } from '../../src/lambdas/create';
import booking from '../../src/helpers/booking';
import getMeetingHtmlBody from '../../src/helpers/getMeetingHtmlBody';
import { BookingRequest } from '../../src/helpers/types';
import { validateCreateBookingRequest } from './../../src/helpers/validateCreateBookingRequest';

jest.mock('../../src/helpers/booking');
jest.mock('../../src/helpers/getMeetingHtmlBody');
jest.mock('./../../src/helpers/validateCreateBookingRequest');

const { create, createRemoteMeeting } = jest.mocked(booking);
const mockedGetMeetingHtmlBody = jest.mocked(getMeetingHtmlBody);
const mockedValidateCreateBookingRequest = jest.mocked(validateCreateBookingRequest);

const mockBody: BookingRequest = {
  organizationRequiredAttendees: ['outlook.user@helsingborg.se'],
  externalRequiredAttendees: ['user@test.se'],
  optionalAttendees: [],
  startTime: '2021-05-30T10:00:00',
  endTime: '2021-05-30T11:00:00',
  subject: 'economy',
  location: 'secret location',
  referenceCode: 'code1234',
  remoteMeeting: false,
  formData: {
    firstname: {
      value: 'Test',
      name: 'Förnamn',
    },
  },
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

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates a booking successfully', async () => {
  expect.assertions(4);

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

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  mockedGetMeetingHtmlBody.mockReturnValueOnce('html');
  create.mockResolvedValueOnce({ data: responseData });

  const result = await main(mockEvent, mockContext);

  expect(mockedValidateCreateBookingRequest).toHaveBeenCalled();
  expect(mockedGetMeetingHtmlBody).toHaveBeenCalledWith(
    {
      firstname: { name: 'Förnamn', value: 'Test' },
    },
    undefined
  );
  expect(booking.create).toHaveBeenCalledWith({
    requiredAttendees: ['outlook.user@helsingborg.se', 'user@test.se'],
    optionalAttendees: [],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    body: 'html',
    location: 'secret location',
    referenceCode: 'code1234',
  });
  expect(result).toEqual(expectedResult);
});

it('calls "getMeetingHtmlBody" with a meeting link when remoteMeeting is true', async () => {
  expect.assertions(1);

  const responseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        BookingId: '123456789',
      },
    },
  };
  const remoteMeetingResponseData = {
    jsonapi: { version: '1.0' },
    data: {
      attributes: {
        Id: 'string',
        Subject: 'string',
        OnlineMeetingUrl: 'remote.meeting.link',
      },
    },
  };

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  createRemoteMeeting.mockResolvedValueOnce({ data: remoteMeetingResponseData });
  create.mockResolvedValueOnce({ data: responseData });

  await main({ body: JSON.stringify({ ...mockBody, remoteMeeting: true }) }, mockContext);

  expect(mockedGetMeetingHtmlBody).toHaveBeenCalledWith(
    {
      firstname: { name: 'Förnamn', value: 'Test' },
    },
    'remote.meeting.link'
  );
});

it('throws when booking.create fails', async () => {
  expect.assertions(3);

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

  mockedValidateCreateBookingRequest.mockResolvedValueOnce();
  mockedGetMeetingHtmlBody.mockReturnValueOnce('html');
  create.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent, mockContext);

  expect(mockedValidateCreateBookingRequest).toHaveBeenCalled();
  expect(booking.create).toHaveBeenCalledWith({
    requiredAttendees: ['outlook.user@helsingborg.se', 'user@test.se'],
    optionalAttendees: [],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    body: 'html',
    location: 'secret location',
    referenceCode: 'code1234',
  });
  expect(result).toEqual(expectedResult);
});

it('throws when vaildateCreateBookingRequest fails', async () => {
  expect.assertions(2);

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '400',
        code: '400',
        detail: 'detail',
        message: 'message',
      },
    }),
    headers: mockHeaders,
    statusCode: 400,
  };

  mockedValidateCreateBookingRequest.mockRejectedValueOnce({
    detail: 'detail',
    message: 'message',
  });

  const result = await main(mockEvent, mockContext);

  expect(booking.create).not.toHaveBeenCalled();
  expect(result).toEqual(expectedResult);
});
