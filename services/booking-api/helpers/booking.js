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

function cancel(body) {
  return sendBookingPostRequest(PATH.CANCEL, body);
}

function get(body) {
  return sendBookingPostRequest(PATH.GET, body);
}

async function sendBookingPostRequest(path, body) {
  const { outlookBookingEndpoint, apiKey } = await params.read(config.booking.envsKeyName);

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const url = `${outlookBookingEndpoint}/${path}`;
  const response = request.call(requestClient, METHOD.POST, url, body);

  return response;
}

export default { create, cancel, get };
