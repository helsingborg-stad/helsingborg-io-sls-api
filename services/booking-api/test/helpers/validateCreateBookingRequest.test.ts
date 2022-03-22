import booking from '../../src/helpers/booking';
import strings from '../../src/helpers/strings';
import { BookingRequest } from '../../src/helpers/types';
import { validateCreateBookingRequest } from '../../src/helpers/validateCreateBookingRequest';
import { areAllAttendeesAvailable } from '../../src/helpers/timeSpanHelper';

jest.mock('../../src/helpers/timeSpanHelper');
const mockedAreAllAttendeesAvailable = jest.mocked(areAllAttendeesAvailable);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2021-05-29T10:00:00'));
  jest.resetAllMocks();
});

it('throws error when "organizationRequiredAttendees" parameter is missing', async () => {
  const bookingRequest = {
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.missingRequiredParamter,
    message: errorMessage,
  });
});

it('throws error when "externalRequiredAttendees" parameter is missing', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.missingRequiredParamter,
    message: errorMessage,
  });
});

it('throws error when "startTime" parameter is missing', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.missingRequiredParamter,
    message: errorMessage,
  });
});

it('throws error when "endTime" parameter is missing', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.missingRequiredParamter,
    message: errorMessage,
  });
});

it('throws error when "subject" parameter is missing', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  const errorMessage =
    'Missing one or more required parameters: "organizationRequiredAttendees", "externalRequiredAttendees", "startTime", "endTime", "subject"';

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.missingRequiredParamter,
    message: errorMessage,
  });
});

it('throws error if startTime is in the passed', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2021-05-30T12:00:00'));
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.startTimePassed,
    message: 'Parameter "startTime" cannot be set to a passed value',
  });
});

it('throws error if all attendees is busy', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  booking.getTimeSpans = jest.fn(() =>
    Promise.resolve({
      data: {
        data: {
          attributes: {
            mockAttendee: [{ StartTime: 'mock start time', EndTime: 'mock end time' }],
          },
        },
      },
    })
  );

  mockedAreAllAttendeesAvailable.mockReturnValueOnce(false);

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.timespanNotExisting,
    message: 'No timeslot exists in the given interval',
  });
});

it('throws error timeslot does not exist', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  booking.getTimeSpans = jest.fn(() =>
    Promise.resolve({
      data: {
        data: {
          attributes: {
            mockAttendee: [],
          },
        },
      },
    })
  );

  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    detail: strings.booking.create.timespanNotExisting,
    message: 'No timeslot exists in the given interval',
  });
});

it('throws error if timeslot request fails', async () => {
  const bookingRequest = {
    organizationRequiredAttendees: ['user@user.com'],
    externalRequiredAttendees: ['user@user.com'],
    startTime: '2021-05-30T10:00:00',
    endTime: '2021-05-30T11:00:00',
    subject: 'economy',
    formData: {},
    remoteMeeting: false,
  } as BookingRequest;
  booking.getTimeSpans = jest.fn(() => Promise.reject());

  mockedAreAllAttendeesAvailable.mockReturnValueOnce(true);

  const error = await validateCreateBookingRequest(bookingRequest).catch(e => e);

  expect(error).toEqual({
    message: 'Error finding timeSpan 2021-05-30T10:00:00 - 2021-05-30T11:00:00',
  });
});
