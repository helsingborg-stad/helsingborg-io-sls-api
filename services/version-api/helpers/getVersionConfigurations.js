import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import params from '../../../libs/params';
import config from '../../../config';

/**
 * Fetch application version configurations from AWS SSM Parameter store
 *
 * @returns {Promise<{versions: {ios: {min: string, max: string}, android:{ min: string, max: string}}}>} SSM parameters
 */
async function getVersionConfigurations() {
  const [error, response] = await to(params.read(config.version.envsKeyName));
  if (error) {
    throwError(500);
  }

  return response;
}

export { getVersionConfigurations };
