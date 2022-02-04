import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

const URI_RESOURCE = {
  CREATE: 'booking/create',
  CANCEL: 'booking/cancel',
  GET: 'booking/get',
  SEARCH: 'booking/search',
  GET_HISTORICAL_ATTENDEES: 'booking/getHistoricalAttendees',
};

const METHOD = {
  POST: 'post',
};

function create(body) {
  return sendBookingPostRequest(URI_RESOURCE.CREATE, body);
}

function cancel(bookingId) {
  return sendBookingPostRequest(URI_RESOURCE.CANCEL, { bookingId });
}

function get(bookingId) {
  return sendBookingPostRequest(URI_RESOURCE.GET, { bookingId });
}

function search(body) {
  return sendBookingPostRequest(URI_RESOURCE.SEARCH, body);
}

function getHistoricalAttendees(body) {
  const requestTimeout = process.env.requestTimeout;
  return sendBookingPostRequest(URI_RESOURCE.GET_HISTORICAL_ATTENDEES, body, requestTimeout);
}

async function sendBookingPostRequest(path, body, requestTimeout) {
  const { datatorgetEndpoint, apiKey } = await getSsmParameters();

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey },
    requestTimeout
  );

  const url = `${datatorgetEndpoint}/${path}`;
  const [error, response] = await to(request.call(requestClient, METHOD.POST, url, body));
  if (error) {
    const { status, statusText } = error.response;
    throw { status, message: statusText };
  }

  return response;
}

async function getSsmParameters() {
  const [error, response] = await to(params.read(config.datatorget.envsKeyName));
  if (error) {
    throwError(500);
  }

  return response;
}

export default { create, cancel, get, search, getHistoricalAttendees };
