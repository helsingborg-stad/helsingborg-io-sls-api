import { isMetricValueWithMeta } from './metrics';

import type { MetricType } from './metrics.constants';
import type { MaybeMetricMeta, Metric, MetricValue } from './metrics.types';

export default class MetricBuilder<TMeta extends MaybeMetricMeta = void> {
  #metric: Metric<TMeta>;

  constructor(name: string) {
    this.#metric = {
      name,
      values: [],
    };
  }

  setHelp(help: string): MetricBuilder<TMeta> {
    this.#metric.help = help;
    return this;
  }

  setType(type: MetricType): MetricBuilder<TMeta> {
    this.#metric.type = type;
    return this;
  }

  addValue(value: MetricValue<TMeta>): MetricBuilder<TMeta> {
    const isMetricMetaless = !isMetricValueWithMeta(value);
    const hasValuesAlready = this.#metric.values.length > 0;
    const hasMetalessValues = this.#metric.values.some(value => !isMetricValueWithMeta(value));

    const reachedMetalessLimit = (isMetricMetaless && hasValuesAlready) || hasMetalessValues;

    if (reachedMetalessLimit) {
      throw new Error(
        `Metaless metric cannot contain more than 1 value (metric ${this.#metric.name})`
      );
    }

    this.#metric.values.push(value);

    return this;
  }

  getMetric(): Metric<TMeta> {
    if (this.#metric.values.length == 0) {
      throw new Error(`No values specified for metric ${this.#metric.name}`);
    }

    return this.#metric;
  }
}
