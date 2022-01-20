import smCompare from 'semver-compare';

import { VERSION_STATUS } from '../constants';

const COMPARISON_RESULT = {
  EQUAL: 0,
  SMALLER: -1,
  GREATER: 1,
};

/**
 * Decides the status to return depending on currentVersion
 *
 * @param {string} currentVersion The current application version (in semver format)
 * @param {string} minVersion The minimum allowed application version (in semver format)
 * @param {string} maxVersion The latest application version released (in semver format)
 * @returns {string} Version status
 */
function decideVersionStatus(currentVersion, minVersion, maxVersion) {
  const maxVersionComparison = smCompare(currentVersion, maxVersion);
  const minVersionComparison = smCompare(currentVersion, minVersion);

  if (maxVersionComparison === COMPARISON_RESULT.EQUAL) {
    return VERSION_STATUS.OK;
  }

  if (
    maxVersionComparison === COMPARISON_RESULT.SMALLER &&
    minVersionComparison === COMPARISON_RESULT.GREATER
  ) {
    return VERSION_STATUS.UPDATE_OPTIONAL;
  }

  if (minVersionComparison === COMPARISON_RESULT.SMALLER) {
    return VERSION_STATUS.UPDATE_REQUIRED;
  }

  return VERSION_STATUS.OK;
}

export { decideVersionStatus };
