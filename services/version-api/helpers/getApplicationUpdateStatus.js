import smCompare from 'semver-compare';

import { VERSION_STATUS } from '../constants';

const COMPARISON_RESULT = {
  EQUAL: 0,
  SMALLER: -1,
  GREATER: 1,
};

/**
 * @param {{current: string, min: string, max: string}} parameters (properties in semver format i.e "1.2.0")
 * @returns {string} Status
 */
function getApplicationUpdateStatus({ current, min, max }) {
  const maxComparison = smCompare(current, max);
  const minComparison = smCompare(current, min);

  if (maxComparison === COMPARISON_RESULT.EQUAL) {
    return VERSION_STATUS.OK;
  }

  if (maxComparison === COMPARISON_RESULT.SMALLER && minComparison === COMPARISON_RESULT.GREATER) {
    return VERSION_STATUS.UPDATE_OPTIONAL;
  }

  if (minComparison === COMPARISON_RESULT.SMALLER) {
    return VERSION_STATUS.UPDATE_REQUIRED;
  }

  return VERSION_STATUS.OK;
}

export { getApplicationUpdateStatus };
