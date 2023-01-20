import { isMetricValueWithMeta } from '../../src/helpers/metrics';
import type { MaybeMetricMeta, MetricValue } from '../../src/helpers/metrics.types';

describe('metrics', () => {
  describe('isMetricValueWithMeta', () => {
    it('returns true for valid metric objects with meta', () => {
      const result = isMetricValueWithMeta({ value: 1, meta: { hello: 'world' } });
      expect(result).toBe(true);
    });

    it('returns false for valid metric objects without meta', () => {
      const result = isMetricValueWithMeta({ value: 1 });
      expect(result).toBe(false);
    });

    it('returns false for valid metric objects with empty meta', () => {
      const result = isMetricValueWithMeta({ value: 1, meta: {} });
      expect(result).toBe(false);
    });

    test.each([{}, [], ['meta'], { meta: {} }] as unknown as MetricValue<MaybeMetricMeta>[])(
      'returns false for invalid values (%s)',
      value => {
        const result = isMetricValueWithMeta(value);
        expect(result).toBe(false);
      }
    );
  });
});
