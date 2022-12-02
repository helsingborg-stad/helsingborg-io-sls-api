import { getMetricFormatter, ValidFormat } from './formatter';

import type { MetricFormatter } from './formats.types';

describe('formatter (metrics)', () => {
  describe('getMetricFormatter', () => {
    test.each(Object.values(ValidFormat))(
      'return a valid formatter for all formats (%s)',
      format => {
        const result = getMetricFormatter(format);
        expect(result).toMatchObject<MetricFormatter>({
          format: expect.any(Function),
          formatMultiple: expect.any(Function),
        });
      }
    );

    it('throws on invalid format', () => {
      function func() {
        getMetricFormatter('invalid format' as ValidFormat);
      }

      expect(func).toThrow();
    });
  });
});
