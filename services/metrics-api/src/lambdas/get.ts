import { wrappers } from '../libs/lambdaWrapper';
import { ekbMetricsCollector } from '../helpers/collectors';
import { collectFromAll } from '../helpers/collectors';
import { getMetricFormatter } from '../helpers/formats';

import type { ValidFormat } from '../helpers/formats';

export interface GetMetricsRequest {
  format: ValidFormat;
}

export interface Dependencies {
  ekbMetricsCollector: typeof ekbMetricsCollector;
}

export async function getMetrics(
  { format }: GetMetricsRequest,
  dependencies: Dependencies
): Promise<string> {
  const metrics = await collectFromAll([dependencies.ekbMetricsCollector]);
  const formatter = getMetricFormatter(format);
  return formatter.formatMultiple(metrics);
}

export const main = wrappers.restRaw.wrap(getMetrics, { ekbMetricsCollector });
