import { createCasesMetrics } from '../../../src/helpers/collectors/ekbMetricsCollector';
import { MetricType } from '../../../src/helpers/metrics.constants';
import type { StatusCollection } from '../../../src/helpers/cases';
import type { CaseMeta } from '../../../src/helpers/collectors/ekbMetricsCollector';
import type { Metric } from '../../../src/helpers/metrics.types';

describe('createCasesMetrics', () => {
  it(`should return cases metrics collection`, async () => {
    const statusCollection: StatusCollection = {
      ekb_cases_open_total: {
        'notStarted:viva': 1,
        'newApplication:viva': 10,
      },
      ekb_cases_closed_total: {
        'closed:approved:viva': 2,
      },
    };

    const expectedResult: Metric<CaseMeta>[] = [
      {
        name: 'ekb_cases_open_total',
        help: 'Total number of open cases',
        type: MetricType.GAUGE,
        values: [
          {
            value: 1,
            meta: {
              status: 'notStarted:viva',
            },
          },
          {
            value: 10,
            meta: {
              status: 'newApplication:viva',
            },
          },
        ],
      },
      {
        name: 'ekb_cases_closed_total',
        help: 'Total number of closed cases',
        type: MetricType.GAUGE,
        values: [
          {
            value: 2,
            meta: {
              status: 'closed:approved:viva',
            },
          },
        ],
      },
    ];

    const result = createCasesMetrics(statusCollection);
    expect(result).toEqual(expectedResult);
  });

  it(`should only return metrics containing actual values`, async () => {
    const statusCollection: StatusCollection = {
      ekb_cases_open_total: {
        'notStarted:viva': 1,
      },
      ekb_cases_closed_total: {},
    };

    const expectedResult: Metric<CaseMeta>[] = [
      {
        name: 'ekb_cases_open_total',
        help: 'Total number of open cases',
        type: MetricType.GAUGE,
        values: [
          {
            value: 1,
            meta: {
              status: 'notStarted:viva',
            },
          },
        ],
      },
    ];

    const result = createCasesMetrics(statusCollection);
    expect(result).toEqual(expectedResult);
  });
});
