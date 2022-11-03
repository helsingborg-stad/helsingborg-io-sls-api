import type { MaybeMetricMeta, Metric } from '../metrics.types';

export interface MetricsCollector<TMeta extends MaybeMetricMeta> {
  collect(): Promise<Metric<TMeta>[]>;
}

export async function collectFromAll(
  collectors: MetricsCollector<MaybeMetricMeta>[]
): Promise<Metric<MaybeMetricMeta>[]> {
  const promises = collectors.map(collector => collector.collect());
  const allResults = await Promise.all(promises);
  const flattened = allResults.flat();
  return flattened;
}
