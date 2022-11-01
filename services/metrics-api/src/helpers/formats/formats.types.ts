import type { Metric } from '../metrics.types';

export type SingleMetricFormatterFunc = (metric: Metric) => string;
export type MultipleMetricsFormatterFunc = (metrics: Metric[]) => string;

export interface MetricFormatter {
  format: SingleMetricFormatterFunc;
  formatMultiple: MultipleMetricsFormatterFunc;
}
