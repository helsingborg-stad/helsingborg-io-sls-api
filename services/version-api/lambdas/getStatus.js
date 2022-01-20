import to from 'await-to-js';

import * as response from '../../../libs/response';
import log from '../../../libs/logs';

import { getApplicationUpdateStatus } from '../helpers/getApplicationUpdateStatus';
import { getVersionConfigurations } from '../helpers/getVersionConfigurations';

const USER_AGENT = 'User-Agent';
const SPLIT_SYMBOL = '/';
const SUPPORTED_OS = ['ios', 'android'];

/**
 * @param {{ headers: { User_Agent: string }}} event
 * @returns {Promise<string>} The version status (i.e "OK", "UPDATE_OPTIONAL" or "UPDATE_REQUIRED")
 */
export async function main(event, context) {
  const userAgent = event.headers[USER_AGENT];
  const [, deviceApplicationVersion, deviceOS] = userAgent.split(SPLIT_SYMBOL);

  const isMalformedUserAgent = !SUPPORTED_OS.includes(deviceOS) || !deviceApplicationVersion;
  if (isMalformedUserAgent) {
    log.error(
      `Failed to get version status due to malformed User-Agent header: ${userAgent}`,
      context.awsRequestId,
      'service-version-api-001'
    );
    return response.failure({ status: 500, message: 'Malformed `User-Agent` header' });
  }

  const [configurationsError, { versions }] = await to(getVersionConfigurations());
  if (configurationsError) {
    log.error(
      'Failed fetching version configurations from SSM',
      context.awsRequestId,
      'service-version-api-002',
      configurationsError
    );
    return response.failure(configurationsError);
  }

  const { min, max } = versions[deviceOS];
  const versionStatus = getApplicationUpdateStatus({ current: deviceApplicationVersion, min, max });

  return response.success(200, { versionStatus });
}
