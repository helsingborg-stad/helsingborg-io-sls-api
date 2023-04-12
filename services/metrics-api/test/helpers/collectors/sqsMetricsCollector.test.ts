import { MetricType } from '../../../src/helpers/metrics.constants';
import { createSqsMetrics } from '../../../src/helpers/collectors/sqsMetricsCollector';

import type { Queue } from '../../../src/libs/sqs/sqs.types';
import type { Metric } from '../../../src/helpers/metrics.types';
import type { SqsMeta } from '../../../src/helpers/collectors/sqsMetricsCollector';

describe('createSqsMetrics', () => {
  it('should return SQS Metrics', async () => {
    const queueSources: Queue[] = [
      {
        name: 'FakeQueue1',
        approximateMessageCount: 5,
        isDeadLetterQueue: false,
      },
      {
        name: 'FakeQueue2',
        approximateMessageCount: 0,
        isDeadLetterQueue: false,
      },
      {
        name: 'FakeQueue3',
        approximateMessageCount: 102,
        isDeadLetterQueue: false,
      },
      {
        name: 'FakeDeadQueue1',
        approximateMessageCount: 15,
        isDeadLetterQueue: true,
      },
      {
        name: 'FakeDeadQueue2',
        approximateMessageCount: 99999,
        isDeadLetterQueue: true,
      },
    ];

    const expected: Metric<SqsMeta>[] = expect.arrayContaining([
      {
        name: 'sqs_total',
        type: MetricType.GAUGE,
        help: expect.any(String),
        values: [
          { meta: { source: 'FakeQueue1', isDlq: false }, value: 5 },
          { meta: { source: 'FakeQueue2', isDlq: false }, value: 0 },
          { meta: { source: 'FakeQueue3', isDlq: false }, value: 102 },
          { meta: { source: 'FakeDeadQueue1', isDlq: true }, value: 15 },
          { meta: { source: 'FakeDeadQueue2', isDlq: true }, value: 99999 },
        ],
      },
    ]);

    const metrics = createSqsMetrics(queueSources);

    expect(metrics).toEqual(expected);
  });
});
