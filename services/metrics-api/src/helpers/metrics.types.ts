import type { MetricType } from './metrics.constants';

export type MetricMetaBase = Record<string, unknown>;
export type MaybeMetricMeta = MetricMetaBase | void;

type MetricValueNoMeta = {
  value: number;
};
type MetricMeta<TMeta extends MaybeMetricMeta> = TMeta extends void
  ? MetricValueNoMeta
  : { meta: TMeta };

export type MetricValue<TMeta extends MaybeMetricMeta = void> = MetricValueNoMeta &
  MetricMeta<TMeta>;

export type MetricValueWithMeta = MetricValue<MetricMetaBase>;

export interface Metric<TMeta extends MaybeMetricMeta = void> {
  name: string;
  help?: string;
  type?: MetricType;
  values: MetricValue<TMeta>[];
}
