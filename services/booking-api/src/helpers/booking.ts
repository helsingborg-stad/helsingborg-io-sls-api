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
  BookingBody,
  GetHistoricalAttendeesResponse,
  GetTimeSpansResponse,
  GetTimeSpansBody,
} from './types';

const URI_RESOURCE = {
  CREATE: 'booking/create',
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

function create(body: BookingBody) {
  return sendBookingPostRequest<BookingCreateResponse>(URI_RESOURCE.CREATE, body);
}

function cancel(bookingId: string) {
  return sendBookingPostRequest<undefined>(URI_RESOURCE.CANCEL, { bookingId });
}

function get(bookingId: string | undefined) {
  return sendBookingPostRequest<BookingCreateResponse>(URI_RESOURCE.GET, { bookingId });
}

function search(body: BookingBody) {
  return sendBookingPostRequest<BookingSearchResponse>(URI_RESOURCE.SEARCH, body);
}

function getHistoricalAttendees(body: BookingBody) {
  const requestTimeout = process.env.requestTimeout;
  return sendBookingPostRequest<HistoricalAttendeesResponse>(
    URI_RESOURCE.GET_HISTORICAL_ATTENDEES,
    body,
    Number(requestTimeout)
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

async function sendBookingPostRequest<T>(
  path: string,
  body: unknown,
  requestTimeout: number | undefined = undefined
): Promise<T> {
  const { datatorgetEndpoint, apiKey } = await getSsmParameters();

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey },
    requestTimeout
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
};
