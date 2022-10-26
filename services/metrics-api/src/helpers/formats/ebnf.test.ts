import { ebnf } from '.';
import type { MaybeMetricMeta, Metric } from '../metrics.types';

describe('EBNF adapter', () => {
  it('handles simple metric', () => {
    const metric: Metric = {
      name: 'hello',
      values: [{ value: 123 }],
    };

    const result = ebnf.format(metric);

    expect(result).toBe('hello 123');
  });

  it('handles floats', () => {
    const metric: Metric = {
      name: 'hello',
      values: [{ value: 420.1337 }],
    };

    const result = ebnf.format(metric);

    expect(result).toBe('hello 420.1337');
  });

  it('shows help', () => {
    const metric: Metric = {
      name: 'myMetric',
      values: [{ value: 1 }],
      help: 'lorem ipsum dolar sitem.',
    };

    const result = ebnf.format(metric);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('# HELP myMetric lorem ipsum dolar sitem.');
  });

  it('shows type', () => {
    const metric: Metric = {
      name: 'myMetric',
      values: [{ value: 1 }],
      type: 'counter',
    };

    const result = ebnf.format(metric);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('# TYPE myMetric counter');
  });

  it('handles labels', () => {
    const metric: Metric<{ A: string; B: string }> = {
      name: 'hello',
      values: [
        {
          value: 1,
          meta: {
            A: 'lorem',
            B: 'ipsum',
          },
        },
      ],
    };

    const result = ebnf.format(metric);

    expect(result).toBe('hello{A="lorem",B="ipsum"} 1');
  });

  it('handles multiple metrics', () => {
    const metrics: Metric<MaybeMetricMeta>[] = [
      {
        name: 'hello',
        values: [{ value: 123 }],
      },
      {
        name: 'myMetric1',
        values: [{ value: 3.1415 }],
        help: 'short version of PI.',
        type: 'gauge',
      },
      {
        name: 'myMetric2',
        values: [{ value: 1.41421 }],
        help: 'Square root of 2 probably.',
        type: 'histogram',
      },
      {
        name: 'myMetric3',
        values: [
          {
            value: 2.71828,
            meta: {
              source: 'wikipedia',
              verified: 'false',
            },
          },
        ],
        help: "Approximation of Euler's number.",
        type: 'untyped',
      },
    ];

    const expected = [
      'hello 123',
      '',
      '# HELP myMetric1 short version of PI.',
      '# TYPE myMetric1 gauge',
      'myMetric1 3.1415',
      '',
      '# HELP myMetric2 Square root of 2 probably.',
      '# TYPE myMetric2 histogram',
      'myMetric2 1.41421',
      '',
      "# HELP myMetric3 Approximation of Euler's number.",
      '# TYPE myMetric3 untyped',
      'myMetric3{source="wikipedia",verified="false"} 2.71828',
    ].join('\n');

    const result = ebnf.formatMultiple(metrics);

    expect(result).toBe(expected);
  });

  it('produces nothing for a metric without values', () => {
    const metric: Metric = {
      name: 'hello',
      values: [],
    };

    const result = ebnf.format(metric);

    expect(result).toBe('');
  });

  it('ignores empty metrics for multiple metrics', () => {
    const metrics: Metric[] = [
      {
        name: 'A',
        values: [{ value: 1 }],
      },
      {
        name: 'B',
        values: [],
      },
      {
        name: 'C',
        values: [{ value: 3 }],
      },
    ];

    const expected = ['A 1', '', 'C 3'].join('\n');

    const result = ebnf.formatMultiple(metrics);

    expect(result).toBe(expected);
  });
});
