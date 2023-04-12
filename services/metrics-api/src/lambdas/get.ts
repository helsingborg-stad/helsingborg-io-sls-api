import { wrappers } from '../libs/lambdaWrapper';
import { collectFromAll } from '../helpers/collectors';
import { getMetricFormatter } from '../helpers/formats';
import { ekbMetricsCollector, sqsMetricsCollector } from '../helpers/collectors';

import type { ValidFormat } from '../helpers/formats';
import type { MaybeMetricMeta } from '../helpers/metrics.types';
import type { MetricsCollector } from '../helpers/collectors/metricsCollector';

export interface GetMetricsRequest {
  format: ValidFormat;
}

export interface Dependencies {
  collectors: MetricsCollector<MaybeMetricMeta>[];
}

export async function getMetrics(
  { format }: GetMetricsRequest,
  { collectors }: Dependencies
): Promise<string> {
  const metrics = await collectFromAll(collectors);
  const formatter = getMetricFormatter(format);
  return formatter.formatMultiple(metrics);
}

export const main = wrappers.restRaw.wrap(getMetrics, {
  collectors: [ekbMetricsCollector, sqsMetricsCollector],
});
