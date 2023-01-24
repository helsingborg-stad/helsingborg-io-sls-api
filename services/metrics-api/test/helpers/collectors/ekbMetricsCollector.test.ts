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

  it(`should return metrics for every status`, async () => {
    const statusCollection: StatusCollection = {
      ekb_cases_open_total: {
        'active:completionRequired': 0,
        'active:completionRequired:viva': 0,
        'active:newApplication:randomCheckRequired:viva': 0,
        'active:ongoing': 0,
        'active:ongoing:completion': 0,
        'active:ongoing:newApplication': 0,
        'active:processing': 0,
        'active:processing:completionsDueDatePassed:viva': 0,
        'active:randomCheckRequired': 0,
        'active:randomCheckRequired:viva': 0,
        'active:signature:completed': 0,
        'active:signature:pending': 0,
        'active:submitted': 0,
        'active:submitted:completion:viva': 0,
        'active:submitted:randomCheck': 0,
        'active:submitted:randomCheck:viva': 0,
        newApplication: 0,
        'newApplication:viva': 0,
        notStarted: 0,
        'notStarted:viva': 0,
      },
      ekb_cases_closed_total: {
        'closed:approved:viva': 0,
        'closed:completionRejected:viva': 0,
        'closed:partiallyApproved': 0,
        'closed:partiallyApproved:viva': 0,
        'closed:randomCheckRejected:viva': 0,
        'closed:rejected:viva': 0,
      },
    };

    const expectedResult: Metric<CaseMeta>[] = [
      {
        name: 'ekb_cases_open_total',
        help: 'Total number of open cases',
        type: MetricType.GAUGE,
        values: [
          { value: 0, meta: { status: 'active:completionRequired' } },
          { value: 0, meta: { status: 'active:completionRequired:viva' } },
          { value: 0, meta: { status: 'active:newApplication:randomCheckRequired:viva' } },
          { value: 0, meta: { status: 'active:ongoing' } },
          { value: 0, meta: { status: 'active:ongoing:completion' } },
          { value: 0, meta: { status: 'active:ongoing:newApplication' } },
          { value: 0, meta: { status: 'active:processing' } },
          { value: 0, meta: { status: 'active:processing:completionsDueDatePassed:viva' } },
          { value: 0, meta: { status: 'active:randomCheckRequired' } },
          { value: 0, meta: { status: 'active:randomCheckRequired:viva' } },
          { value: 0, meta: { status: 'active:signature:completed' } },
          { value: 0, meta: { status: 'active:signature:pending' } },
          { value: 0, meta: { status: 'active:submitted' } },
          { value: 0, meta: { status: 'active:submitted:completion:viva' } },
          { value: 0, meta: { status: 'active:submitted:randomCheck' } },
          { value: 0, meta: { status: 'active:submitted:randomCheck:viva' } },
          { value: 0, meta: { status: 'newApplication' } },
          { value: 0, meta: { status: 'newApplication:viva' } },
          { value: 0, meta: { status: 'notStarted' } },
          { value: 0, meta: { status: 'notStarted:viva' } },
        ],
      },
      {
        name: 'ekb_cases_closed_total',
        help: 'Total number of closed cases',
        type: MetricType.GAUGE,
        values: [
          { value: 0, meta: { status: 'closed:approved:viva' } },
          { value: 0, meta: { status: 'closed:completionRejected:viva' } },
          { value: 0, meta: { status: 'closed:partiallyApproved' } },
          { value: 0, meta: { status: 'closed:partiallyApproved:viva' } },
          { value: 0, meta: { status: 'closed:randomCheckRejected:viva' } },
          { value: 0, meta: { status: 'closed:rejected:viva' } },
        ],
      },
    ];

    const result = createCasesMetrics(statusCollection);
    expect(result).toEqual(expectedResult);
  });
});
