import to from 'await-to-js';

import * as request from '../libs/request';
import params from '../libs/params';
import config from '../libs/config';

const URI_SOURCE = 'misc/getGroupMembers';

export interface SearchAdministratorsResult {
  data?: Record<string, unknown>;
}

async function searchAdministrators(body: {
  email?: string;
  mailbox?: string;
}): Promise<SearchAdministratorsResult | undefined> {
  const [readError, { datatorgetEndpoint, apiKey }] = await to(
    params.read(config.datatorget.envsKeyName)
  );
  if (readError) {
    // eslint-disable-next-line no-console
    console.error('Read parameter error: ', readError);
    throw readError;
  }

  const requestClient = request.requestClient(
    { rejectUnauthorized: false },
    { 'X-ApiKey': apiKey }
  );

  const [datatorgetError, datatorgetResponse] = await to<SearchAdministratorsResult>(
    request.call(requestClient, 'post', `${datatorgetEndpoint}/${URI_SOURCE}`, body)
  );
  if (datatorgetError) {
    throw datatorgetError;
  }

  return datatorgetResponse;
}

export default searchAdministrators;
