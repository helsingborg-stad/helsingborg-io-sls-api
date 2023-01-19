import { createCaseMetricValue } from '../../../src/helpers/collectors/ekbMetricsCollector';
import type { CaseItem } from '../../../src/helpers/query/cases/types';

const cases: CaseItem[] = [
  {
    GSI2PK: 'CREATED#202201',
    status: {
      type: 'ongoing',
    },
  },
  {
    GSI2PK: 'CREATED#202201',
    status: {
      type: 'ongoing',
    },
  },
];

it('should return ekb case metric value', async () => {
  const expected = {
    value: 2,
    meta: {
      status: 'ongoing',
    },
  };

  const result = createCaseMetricValue('ongoing', cases);
  expect(result).toEqual(expected);
});
