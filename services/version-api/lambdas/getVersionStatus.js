import to from 'await-to-js';

import * as response from '../../../libs/response';

import { getVersionConfigurations } from '../helpers/getVersionConfigurations';
import { decideVersionStatus } from '../helpers/decideVersionStatus';

const USER_AGENT = 'User-Agent';
const SPLIT_SYMBOL = '/';
const SUPPORTED_OS = ['ios', 'android'];

/**
 * Function that decides if a users application version of Mitt Helsingborg
 * needs to be updated, can be updated or if version used is ok.
 *
 * @param {object} event The lambda event
 * @param {object} event.headers
 * @param {string} event.headers.User_Agent
 * @returns {Promise<string>} The version status (i.e "OK", "UPDATE_OPTIONAL" or "UPDATE_REQUIRED")
 */
export async function main(event) {
  const [, deviceApplicationVersion, deviceOS] = event.headers[USER_AGENT].split(SPLIT_SYMBOL);

  const isMalformedUserAgent = !SUPPORTED_OS.includes(deviceOS) || !deviceApplicationVersion;
  if (isMalformedUserAgent) {
    return response.failure({ status: 500, message: 'Malformed `User-Agent` header' });
  }

  const [ssmError, { versions }] = await to(getVersionConfigurations());
  if (ssmError) {
    return response.failure(ssmError);
  }

  const { min, max } = versions[deviceOS];
  const versionStatus = decideVersionStatus(deviceApplicationVersion, min, max);

  return response.success(200, { versionStatus });
}
