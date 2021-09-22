import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

const PATH = {
  CREATE: 'create',
  CANCEL: 'cancel',
  GET: 'get',
};

const METHOD = {
  POST: 'post',
};

function create(body) {
  return sendBookingPostRequest(PATH.CREATE, body);
}

function cancel(bookingId) {
  return sendBookingPostRequest(PATH.CANCEL, { bookingId });
}

function get(bookingId) {
  return sendBookingPostRequest(PATH.GET, { bookingId });
}

async function sendBookingPostRequest(path, body) {
  const { outlookBookingEndpoint, apiKey } = await getSsmParameters();

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const url = `${outlookBookingEndpoint}/${path}`;
  const [error, response] = await to(request.call(requestClient, METHOD.POST, url, body));
  if (error) {
    const { status, statusText } = error.response;
    throw { status, message: statusText };
  }

  return response;
}

async function getSsmParameters() {
  const [error, response] = await to(params.read(config.booking.envsKeyName));
  if (error) {
    throwError(500);
  }

  return response;
}

export default { create, cancel, get };
