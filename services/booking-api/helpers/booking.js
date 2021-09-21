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

let outlookBookingEndpoint;
let apiKey;

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
  if (!outlookBookingEndpoint || !apiKey) {
    await getSsmParameters();
  }

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const url = `${outlookBookingEndpoint}/${path}`;
  const response = request.call(requestClient, METHOD.POST, url, body);

  return response;
}

async function getSsmParameters() {
  const ssmParameters = await params.read(config.booking.envsKeyName);

  outlookBookingEndpoint = ssmParameters.outlookBookingEndpoint;
  apiKey = ssmParameters.apiKey;
}

export default { create, cancel, get };
