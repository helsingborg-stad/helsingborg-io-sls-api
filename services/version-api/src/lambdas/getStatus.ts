import * as response from '../libs/response';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';

import { getApplicationUpdateStatus } from '../helpers/getApplicationUpdateStatus';

const USER_AGENT = 'User-Agent';
const SPLIT_SYMBOL = '/';
const SUPPORTED_OS = ['ios', 'android'];

type DeviceOS = 'android' | 'ios';

export interface DeviceVersions {
  min: string;
  max: string;
  updateUrl: string;
}

export interface DeviceConfiguration {
  versions: Record<DeviceOS, DeviceVersions>;
}

export interface Dependencies {
  getVersionConfigurations: (environment: string) => Promise<DeviceConfiguration>;
}

export interface Headers {
  'User-Agent': string;
}

export interface LambdaRequest {
  headers: Headers;
}

function isSupportedOs(deviceOS: string): deviceOS is DeviceOS {
  return SUPPORTED_OS.includes(deviceOS);
}

export async function getStatus(input: LambdaRequest, dependencies: Dependencies) {
  const userAgent = input.headers[USER_AGENT];
  const [, deviceApplicationVersion, deviceOS] = userAgent.split(SPLIT_SYMBOL);

  const isMalformedUserAgent = !isSupportedOs(deviceOS) || !deviceApplicationVersion;
  if (isMalformedUserAgent) {
    log.error(
      `Failed to get version status due to malformed User-Agent header: ${userAgent}`,
      '',
      'service-version-api-001'
    );
    return response.failure({ status: 400, message: 'Malformed `User-Agent` header' });
  }

  const configuration = await dependencies.getVersionConfigurations(config.version.envsKeyName);

  const { min, max, updateUrl } = configuration.versions[deviceOS];
  const status = getApplicationUpdateStatus({ current: deviceApplicationVersion, min, max });

  return response.success(200, { type: 'getStatus', attributes: { status, updateUrl } });
}

export const main = log.wrap(event => {
  return getStatus(event, {
    getVersionConfigurations: params.read,
  });
});
