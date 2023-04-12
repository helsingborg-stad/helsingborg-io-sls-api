import { SQSClient } from '@aws-sdk/client-sqs';
import { AwsSqsService } from '../../libs/sqs/awsSqsService';
import type { Queue } from '../../libs/sqs/sqs.types';
import MetricBuilder from '../metricBuilder';
import { MetricType } from '../metrics.constants';
import type { Metric } from '../metrics.types';
import type { MetricsCollector } from './metricsCollector';

export type SqsMeta = {
  source: string;
  isDlq: boolean;
};

export function createSqsMetrics(queues: Queue[]): Metric<SqsMeta>[] {
  const sqsBuilder = new MetricBuilder<SqsMeta>('sqs_total')
    .setType(MetricType.GAUGE)
    .setHelp('Approximate number of messages in SQS queues');

  queues.forEach(queue => {
    sqsBuilder.addValue({
      value: queue.approximateMessageCount,
      meta: { source: queue.name, isDlq: queue.isDeadLetterQueue },
    });
  });

  return [sqsBuilder.getMetric()];
}

const collector: MetricsCollector<SqsMeta> = {
  async collect(): Promise<Metric<SqsMeta>[]> {
    const sqsService = new AwsSqsService(new SQSClient({}));
    const queues = await sqsService.getQueues();
    const metrics = createSqsMetrics(queues);
    return metrics;
  },
};

export default collector;
