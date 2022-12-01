import log from '../../libs/logs';
import type { MaybeMetricMeta, Metric } from '../metrics.types';

export interface MetricsCollector<TMeta extends MaybeMetricMeta> {
  collect(): Promise<Metric<TMeta>[]>;
}

function promiseIsFulfilled<T>(
  promise: PromiseSettledResult<T>
): promise is PromiseFulfilledResult<T> {
  return promise.status === 'fulfilled';
}

function promiseIsRejected<T>(promise: PromiseSettledResult<T>): promise is PromiseRejectedResult {
  return promise.status === 'rejected';
}

export async function collectFromAll(
  collectors: MetricsCollector<MaybeMetricMeta>[]
): Promise<Metric<MaybeMetricMeta>[]> {
  const promises = collectors.map(collector => collector.collect());

  const settledPromises = await Promise.allSettled(promises);
  const failedPromises = settledPromises.filter(promiseIsRejected);
  const successfulPromises = settledPromises.filter(promiseIsFulfilled);

  failedPromises.forEach(promise => {
    log.writeError(`failed to collect metric: ${promise.reason}`, promise.reason);
  });

  const successfulResults = successfulPromises.map(promise => promise.value).flat();
  return successfulResults;
}
