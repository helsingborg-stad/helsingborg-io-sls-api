import { decideVersionStatus } from '../../helpers/decideVersionStatus';

import { VERSION_STATUS } from '../../constants';

const testCases = [
  { current: '1.2.0', min: '1.0.0', max: '1.2.0', expected: VERSION_STATUS.OK },
  { current: '1.1.0', min: '1.0.0', max: '1.2.0', expected: VERSION_STATUS.UPDATE_OPTIONAL },
  { current: '0.9.9', min: '1.0.0', max: '1.2.0', expected: VERSION_STATUS.UPDATE_REQUIRED },
];

test.each(testCases)(
  'current: $current, min: $min, max: $max, expected: $expected',
  ({ current, min, max, expected }) => {
    const result = decideVersionStatus(current, min, max);

    expect(result).toBe(expected);
  }
);
