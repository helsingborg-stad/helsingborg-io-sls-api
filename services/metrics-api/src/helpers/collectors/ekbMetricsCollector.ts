import casesRepository, { createStatusCollection, removeEmptyMetricsValues } from '../cases';
import MetricBuilder from '../metricBuilder';
import { MetricsHelperText, MetricType } from '../metrics.constants';
import type { StatusCollection } from '../cases';
import type { Metric } from '../metrics.types';
import type { MetricsCollector } from './metricsCollector';

export type CaseMeta = {
  status: string;
};

export function createCasesMetrics(collection: StatusCollection): Metric<CaseMeta>[] {
  const collectionWithValues = removeEmptyMetricsValues(collection);

  const metrics = Object.entries(collectionWithValues).map(([metricName, values]) => {
    const builder = new MetricBuilder<CaseMeta>(metricName);

    builder.setHelp(MetricsHelperText[metricName as keyof typeof MetricsHelperText]);
    builder.setType(MetricType.GAUGE);

    Object.entries(values).forEach(([status, value]) => {
      builder.addValue({ value, meta: { status } });
    });

    return builder.getMetric();
  });

  return metrics;
}

const ekb: MetricsCollector<CaseMeta> = {
  async collect(): Promise<Metric<CaseMeta>[]> {
    const cases = await casesRepository.get();
    const statusCollection = createStatusCollection(cases);
    const casesMetrics = createCasesMetrics(statusCollection);
    return casesMetrics;
  },
};

export default ekb;
