import { NOT_STARTED, ACTIVE_ONGOING, ACTIVE_SIGNATURE_PENDING } from '../../libs/constants';
import casesRepository from '../cases';
import MetricBuilder from '../metricBuilder';
import { MetricType } from '../metrics.constants';
import type { Metric, MetricValue } from '../metrics.types';
import type { MetricsCollector } from './metricsCollector';
import type { CaseItem } from '../query/cases/types';

type CaseMeta = {
  status: string;
};

export function createCaseMetricValue(status: string, cases: CaseItem[]): MetricValue<CaseMeta> {
  const value: number = cases.reduce(
    (count, { status: { type } }) => (type.includes(status) ? ++count : count),
    0
  );
  return { value, meta: { status } };
}

async function createCasesMetrics(cases: CaseItem[]): Promise<Metric<CaseMeta>[]> {
  const casesMetrics: Metric<CaseMeta> = new MetricBuilder<CaseMeta>('ekb_cases_open_total')
    .setHelp('Total number of open cases')
    .setType(MetricType.GAUGE)
    .addValue(createCaseMetricValue(NOT_STARTED, cases))
    .addValue(createCaseMetricValue(ACTIVE_ONGOING, cases))
    .addValue(createCaseMetricValue(ACTIVE_SIGNATURE_PENDING, cases))
    .getMetric();

  return [casesMetrics];
}

const ekbMetricsCollector: MetricsCollector<CaseMeta> = {
  async collect(): Promise<Metric<CaseMeta>[]> {
    const cases: CaseItem[] = await casesRepository.get();
    const casesMetrics: Metric<CaseMeta>[] = await createCasesMetrics(cases);
    return [...casesMetrics];
  },
};

export default ekbMetricsCollector;
