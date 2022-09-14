import semverCompare from 'semver-compare';

import { VERSION_STATUS } from './constants';

const COMPARISON_RESULT = {
  EQUAL: 0,
  SMALLER: -1,
  GREATER: 1,
};

interface GetApplicationUpdateStatus {
  current: string;
  min: string;
  max: string;
}
function getApplicationUpdateStatus({
  current,
  min,
  max,
}: GetApplicationUpdateStatus): VERSION_STATUS {
  const currentComparedToMax = semverCompare(current, max);
  const currentComparedToMin = semverCompare(current, min);

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
