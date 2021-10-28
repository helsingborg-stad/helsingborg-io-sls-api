import to from 'await-to-js';

import * as request from '../../../libs/request';
// import params from '../../../libs/params';
// import config from '../../../config';

async function getTimeSpans(body) {
  // const [parameterError, { outlookTimeSlotsEndpoint, apiKey }] = await to(
  //   params.read(config.timeSlots.envsKeyName)
  // );
  // if (parameterError) {
  //   throw parameterError;
  // }

  const outlookEndpoint =
    'https://helsingborg-dev-agent.frendsapp.com/api/v1/exchangeonline/timeslot/searchAvailableIntervals';
  const apiKey = '5bb810ee-de17-4170-8635-84c677464b8b';

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const [outlookError, outlookResponse] = await to(
    request.call(requestClient, 'post', outlookEndpoint, body)
  );
  if (outlookError) {
    console.error('Could not fetch time spans from outlook: ', outlookError);
    throw outlookError;
  }

  const timeSpans = outlookResponse?.data?.data?.attributes || {};

  return timeSpans;
}

export default getTimeSpans;
