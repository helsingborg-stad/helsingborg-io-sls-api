import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

const URI_RESOURCE = 'timeslot/searchAvailableIntervals';

async function getTimeSpans(body) {
    const [parameterError, { datatorgetEndpoint, apiKey }] = await to(params.read(config.datatorget.envsKeyName));
    if (parameterError) {
        throw parameterError;
    }

    const requestClient = request.requestClient({ rejectUnauthorized: false }, { 'X-ApiKey': apiKey });

    const [outlookError, outlookResponse] = await to(
        request.call(requestClient, 'post', `${datatorgetEndpoint}/${URI_RESOURCE}`, body),
    );
    if (outlookError) {
        console.error('Could not fetch time spans from outlook: ', outlookError);
        throw outlookError;
    }

    const timeSpans = outlookResponse?.data?.data?.attributes || {};

    return timeSpans;
}

export default getTimeSpans;
