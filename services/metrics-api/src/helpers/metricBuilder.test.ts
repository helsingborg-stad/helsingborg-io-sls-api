import MetricBuilder from './metricBuilder';
import type { Metric, MetricValue } from './metrics.types';

const MOCK_METRIC: Metric = {
  name: 'myMetric',
  values: [{ value: 123 }],
};

describe('MetricBuilder', () => {
  it('produces a simple metric', () => {
    const metric = new MetricBuilder('myMetric').addValue({ value: 123 }).getMetric();

    expect(metric).toEqual(MOCK_METRIC);
  });

  it('sets help', () => {
    const expected: Metric = {
      ...MOCK_METRIC,
      help: 'my help text',
    };

    const metric = new MetricBuilder('myMetric')
      .setHelp('my help text')
      .addValue({ value: 123 })
      .getMetric();

    expect(metric).toEqual(expected);
  });

  it('sets type', () => {
    const expected: Metric = {
      ...MOCK_METRIC,
      type: 'summary',
    };

    const metric = new MetricBuilder('myMetric')
      .setType('summary')
      .addValue({ value: 123 })
      .getMetric();

    expect(metric).toEqual(expected);
  });

  test.each([
    [
      'meta-less',
      () => {
        new MetricBuilder('myMetric').addValue({ value: 1 }).addValue({ value: 2 }).getMetric();
      },
    ],
    [
      'empty meta',
      () => {
        new MetricBuilder<Record<string, never>>('myMetric')
          .addValue({ value: 1, meta: {} })
          .addValue({ value: 2, meta: {} })
          .getMetric();
      },
    ],
    [
      'meta-less first',
      () => {
        new MetricBuilder<{ a: string }>('myMetric')
          .addValue({ value: 1 } as MetricValue<{ a: string }>)
          .addValue({ value: 2, meta: { a: 'a' } })
          .getMetric();
      },
    ],
    [
      'meta-less second',
      () => {
        new MetricBuilder<{ a: string }>('myMetric')
          .addValue({ value: 1, meta: { a: 'a' } })
          .addValue({ value: 2 } as MetricValue<{ a: string }>)
          .getMetric();
      },
    ],
  ])('throws on multiple meta-less values (%s)', (_, func) => {
    expect(func).toThrow();
  });

  it('produces complex metric', () => {
    const expected: Metric<{ source: string; purpose: string }> = {
      ...MOCK_METRIC,
      help: 'my helpful metric description',
      type: 'gauge',
      values: [
        {
          value: 123,
          meta: {
            source: 'wikipedia',
            purpose: 'math',
          },
        },
        {
          value: 3.1415,
          meta: {
            source: 'github',
            purpose: 'physics',
          },
        },
        {
          value: 420.1337,
          meta: {
            source: 'forums',
            purpose: 'funny',
          },
        },
        {
          value: 42,
          meta: {
            source: 'galaxy',
            purpose: 'everything',
          },
        },
      ],
    };

    const metric = new MetricBuilder<{ source: string; purpose: string }>('myMetric')
      .setHelp('my helpful metric description')
      .setType('gauge')
      .addValue({
        value: 123,
        meta: {
          source: 'wikipedia',
          purpose: 'math',
        },
      })
      .addValue({
        value: 3.1415,
        meta: {
          source: 'github',
          purpose: 'physics',
        },
      })
      .addValue({
        value: 420.1337,
        meta: {
          source: 'forums',
          purpose: 'funny',
        },
      })
      .addValue({
        value: 42,
        meta: {
          source: 'galaxy',
          purpose: 'everything',
        },
      })
      .getMetric();

    expect(metric).toEqual(expected);
  });

  it('throws on no values', () => {
    function func() {
      new MetricBuilder('myMetric').getMetric();
    }

    expect(func).toThrow();
  });
});
