import type { MetricsCollector } from './metricsCollector';

type CaseMeta = {
  status: string;
};

const ekbMetricsCollector: MetricsCollector<CaseMeta | void> = {
  async collect() {
    return [];
  },
};

export default ekbMetricsCollector;
