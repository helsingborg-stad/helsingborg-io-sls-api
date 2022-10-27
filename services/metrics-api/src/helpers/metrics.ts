import type { MetricValue, MaybeMetricMeta, MetricValueWithMeta } from './metrics.types';

export function isMetricValueWithMeta(
  metricValue: MetricValue<MaybeMetricMeta>
): metricValue is MetricValueWithMeta {
  return 'meta' in metricValue && Object.keys(metricValue.meta).length > 0;
}
