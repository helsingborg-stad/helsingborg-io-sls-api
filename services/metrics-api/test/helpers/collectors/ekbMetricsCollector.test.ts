import { ACTIVE_ONGOING } from '../../../src/libs/constants';
import { createCaseMetricValue } from '../../../src/helpers/collectors/ekbMetricsCollector';
import type { CaseItem } from '../../../src/helpers/query/cases/types';

const cases: CaseItem[] = [
  {
    GSI2PK: 'CREATED#202201',
    status: {
      type: 'active:ongoing',
    },
  },
  {
    GSI2PK: 'CREATED#202201',
    status: {
      type: 'active:ongoing:randomCheck',
    },
  },
];

describe('createCaseMetricValue', () => {
  it(`should return 2 ekb case metric value if status contains: ${ACTIVE_ONGOING}`, async () => {
    const expected = {
      value: 2,
      meta: {
        status: ACTIVE_ONGOING,
      },
    };

    const result = createCaseMetricValue(ACTIVE_ONGOING, cases);
    expect(result).toEqual(expected);
  });
});
