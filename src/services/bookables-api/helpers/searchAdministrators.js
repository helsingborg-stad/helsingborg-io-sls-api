import to from 'await-to-js';

import * as request from '../../../libs/request';
import params from '../../../libs/params';
import config from '../../../config';

const URI_SOURCE = 'misc/getGroupMembers';

async function searchAdministrators(body) {
    const [readError, { datatorgetEndpoint, apiKey }] = await to(params.read(config.datatorget.envsKeyName));
    if (readError) {
        console.error('Read parameter error: ', readError);
        throw readError;
    }

    const requestClient = request.requestClient({ rejectUnauthorized: false }, { 'X-ApiKey': apiKey });

    const [datatorgetError, datatorgetResponse] = await to(
        request.call(requestClient, 'post', `${datatorgetEndpoint}/${URI_SOURCE}`, body),
    );
    if (datatorgetError) {
        throw datatorgetError;
    }

    return datatorgetResponse;
}

export default searchAdministrators;
