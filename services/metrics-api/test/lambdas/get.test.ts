import { getMetrics } from '../../src/lambdas/get';
import { ValidFormat } from '../../src/helpers/formats';
import type { GetMetricsRequest, Dependencies } from '../../src/lambdas/get';

const parameters: GetMetricsRequest = {
  format: ValidFormat.EBNF,
};

function createDependencies(): Dependencies {
  return {
    collectors: [
      {
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
      {
        collect: jest.fn().mockResolvedValue([
          {
            name: 'sqs_total',
            help: 'Approximate number of messages in SQS queues',
            type: 'gauge',
            values: [
              {
                value: 1,
                meta: {
                  source: 'my-queue',
                  isDlq: false,
                },
              },
              {
                value: 30,
                meta: {
                  source: 'my-dead-letter-queue',
                  isDlq: true,
                },
              },
            ],
          },
        ]),
      },
    ],
  };
}

describe('metrics-api get', () => {
  it('should return ekb cases metrics string in EBNF format', async () => {
    const expected = [
      '# HELP ekb_cases_open_total Total number of open cases',
      '# TYPE ekb_cases_open_total gauge',
      'ekb_cases_open_total{status="notStarted"} 5',
      'ekb_cases_open_total{status="ongoing"} 1',
      'ekb_cases_open_total{status="signPending"} 5',
      '',
      '# HELP sqs_total Approximate number of messages in SQS queues',
      '# TYPE sqs_total gauge',
      'sqs_total{source="my-queue",isDlq="false"} 1',
      'sqs_total{source="my-dead-letter-queue",isDlq="true"} 30',
    ].join('\n');

    const result = await getMetrics(parameters, createDependencies());
    expect(result).toBe(expected);
  });
});
