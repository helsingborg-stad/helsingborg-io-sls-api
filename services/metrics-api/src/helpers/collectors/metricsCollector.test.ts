import { collectFromAll } from './metricsCollector';
import MetricBuilder from '../metricBuilder';

import type { MetricsCollector } from './metricsCollector';
import type { Metric } from '../metrics.types';

type MockCollectorMetaA = {
  a: string;
};

type MockCollectorMetaB = {
  b: number;
};

describe('metrics collector', () => {
  it('collects from all given collectors', async () => {
    const mockCollectorA: MetricsCollector<MockCollectorMetaA> = {
      async collect() {
        return [
          new MetricBuilder<MockCollectorMetaA>('a')
            .addValue({ value: 10, meta: { a: 'hello' } })
            .getMetric(),
        ];
      },
    };
    const mockCollectorB: MetricsCollector<MockCollectorMetaB> = {
      async collect() {
        return [
          new MetricBuilder<MockCollectorMetaB>('b')
            .addValue({ value: 42, meta: { b: 123 } })
            .getMetric(),
        ];
      },
    };
    const expected: Metric<MockCollectorMetaA | MockCollectorMetaB>[] = [
      { name: 'a', values: [{ meta: { a: 'hello' }, value: 10 }] },
      { name: 'b', values: [{ meta: { b: 123 }, value: 42 }] },
    ];

    const results = await collectFromAll([mockCollectorA, mockCollectorB]);

    expect(results).toEqual(expected);
  });
});
