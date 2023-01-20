import { getMetrics } from '../../src/lambdas/get';
import { ValidFormat } from '../../src/helpers/formats';
import type { GetMetricsRequest, Dependencies } from '../../src/lambdas/get';

const parameters: GetMetricsRequest = {
  format: ValidFormat.EBNF,
};

function createDependencies(): Dependencies {
  return {
    ekbMetricsCollector: {
      collect: jest.fn().mockResolvedValue([
        {
          name: 'ekb_cases_open_total',
          help: 'Total number of open cases',
          type: 'gauge',
          values: [
            {
              value: 5,
              meta: {
                status: 'notStarted',
              },
            },
            {
              value: 1,
              meta: {
                status: 'ongoing',
              },
            },
            {
              value: 5,
              meta: {
                status: 'signPending',
              },
            },
          ],
        },
      ]),
    },
  };
}

it('should return ekb cases metrics', async () => {
  const expected = [
    '# HELP ekb_cases_open_total Total number of open cases',
    '# TYPE ekb_cases_open_total gauge',
    'ekb_cases_open_total{status="notStarted"} 5',
    'ekb_cases_open_total{status="ongoing"} 1',
    'ekb_cases_open_total{status="signPending"} 5',
  ].join('\n');

  const result = await getMetrics(parameters, createDependencies());
  expect(result).toBe(expected);
});
