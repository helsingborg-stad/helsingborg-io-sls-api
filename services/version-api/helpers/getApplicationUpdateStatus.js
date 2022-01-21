import smCompare from 'semver-compare';

import { VERSION_STATUS } from '../constants';

const COMPARISON_RESULT = {
  EQUAL: 0,
  SMALLER: -1,
  GREATER: 1,
};

/**
 * @param {{current: string, min: string, max: string}} parameters (properties in semver format i.e "1.2.0")
 * @returns {'OK' | 'UPDATE_OPTIONAL' | 'UPDATE_REQUIRED'} Status
 */
function getApplicationUpdateStatus({ current, min, max }) {
  const currentComparedToMax = smCompare(current, max);
  const currentComparedToMin = smCompare(current, min);

  if (currentComparedToMax === COMPARISON_RESULT.EQUAL) {
    return VERSION_STATUS.OK;
  }

  if (
    currentComparedToMax === COMPARISON_RESULT.SMALLER &&
    currentComparedToMin === COMPARISON_RESULT.GREATER
  ) {
    return VERSION_STATUS.UPDATE_OPTIONAL;
  }

  if (currentComparedToMin === COMPARISON_RESULT.SMALLER) {
    return VERSION_STATUS.UPDATE_REQUIRED;
  }

  return VERSION_STATUS.OK;
}

export { getApplicationUpdateStatus };
