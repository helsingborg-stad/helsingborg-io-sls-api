// eslint-disable-next-line @typescript-eslint/no-var-requires
const { throwError } = require('@helsingborg-stad/npm-api-error-handling');
import to from 'await-to-js';

import * as request from '../libs/request';
import params from '../libs/params';
import config from '../libs/config';
import {
  BookingCreateResponse,
  BookingSearchResponse,
  HistoricalAttendeesResponse,
  BookingError,
  CreateBookingRequestBody,
  GetHistoricalAttendeesResponse,
  GetTimeSpansResponse,
  GetTimeSpansBody,
  CreateRemoteMeetingRequestBody,
  CreateRemoteMeetingResponse,
  SearchBookingRequestBody,
  HistoricalAttendeesRequestBody,
} from './types';

const URI_RESOURCE = {
  CREATE: 'booking/create',
  CREATE_REMOTE_MEETING: 'teamsMeeting/create',
  CANCEL: 'booking/cancel',
  GET: 'booking/get',
  SEARCH: 'booking/search',
  GET_HISTORICAL_ATTENDEES: 'booking/getHistoricalAttendees',
  GET_ADMINISTRATOR_DETAILS: 'misc/getUserDetails',
  GET_TIME_SPANS: 'timeslot/searchAvailableIntervals',
};

const METHOD = {
  POST: 'post',
};

function create(body: CreateBookingRequestBody) {
  return sendBookingPostRequest<BookingCreateResponse>(URI_RESOURCE.CREATE, body);
}

function createRemoteMeeting(body: CreateRemoteMeetingRequestBody) {
  return sendBookingPostRequest<CreateRemoteMeetingResponse>(
    URI_RESOURCE.CREATE_REMOTE_MEETING,
    body
  );
}

function cancel(bookingId: string) {
  return sendBookingPostRequest<undefined>(URI_RESOURCE.CANCEL, { bookingId });
}

function get(bookingId: string | undefined) {
  return sendBookingPostRequest<BookingCreateResponse>(URI_RESOURCE.GET, { bookingId });
}

function search(body: SearchBookingRequestBody) {
  return sendBookingPostRequest<BookingSearchResponse>(URI_RESOURCE.SEARCH, body);
}

function getHistoricalAttendees(body: HistoricalAttendeesRequestBody) {
  return sendBookingPostRequest<HistoricalAttendeesResponse>(
    URI_RESOURCE.GET_HISTORICAL_ATTENDEES,
    body
  );
}

function getAdministratorDetails(body: { email: string }) {
  return sendBookingPostRequest<GetHistoricalAttendeesResponse>(
    URI_RESOURCE.GET_ADMINISTRATOR_DETAILS,
    body
  );
}

function getTimeSpans(body: GetTimeSpansBody) {
  return sendBookingPostRequest<GetTimeSpansResponse>(URI_RESOURCE.GET_TIME_SPANS, body);
}

async function sendBookingPostRequest<T>(path: string, body: unknown): Promise<T> {
  const { datatorgetEndpoint, apiKey } = await getSsmParameters();

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey },
    Number(process.env.requestTimeout)
  );

  const url = `${datatorgetEndpoint}/${path}`;
  const [error, response] = await to<T, BookingError>(
    request.call(requestClient, METHOD.POST, url, body)
  );
  if (error) {
    const { status, statusText } = error.response;
    throw { status, message: statusText };
  }

  return response as T;
}

async function getSsmParameters() {
  const [error, response] = await to(params.read(config.datatorget.envsKeyName));
  if (error) {
    throwError(500);
  }

  return response;
}

export default {
  create,
  cancel,
  get,
  search,
  getHistoricalAttendees,
  getAdministratorDetails,
  getTimeSpans,
  createRemoteMeeting,
};
