import { isMetricValueWithMeta } from '../metrics';
import type { MaybeMetricMeta, Metric, MetricValue } from '../metrics.types';
import type { MetricFormatter } from './formats.types';

type CommentToken = 'HELP' | 'TYPE';
type CommentTokenMetric = { [key in Lowercase<CommentToken>]?: string } & { name: string };

function createTokenComment(prefix: CommentToken, metric: CommentTokenMetric): string | null {
  const value: string | undefined = metric[prefix.toLowerCase() as keyof CommentTokenMetric];
  return value ? `# ${prefix} ${metric.name} ${value}` : null;
}

function metricValueToEbnf(name: string, metricValue: MetricValue<MaybeMetricMeta>): string {
  let str = `${name}`;

  if (isMetricValueWithMeta(metricValue)) {
    const labels = Object.entries(metricValue.meta ?? {}).map(
      ([name, value]) => `${name}="${value}"`
    );
    if (labels && labels.length > 0) {
      str += `{${labels.join(',')}}`;
    }
  }

  str += ` ${metricValue.value}`;

  return str;
}

function curriedMetricValueToEbnf(name: string): (metricValue: MetricValue) => string {
  return (metricValue: MetricValue) => metricValueToEbnf(name, metricValue);
}

function metricToEbnf(metric: Metric): string {
  const lines = [
    createTokenComment('HELP', metric),
    createTokenComment('TYPE', metric),
    ...metric.values.map(curriedMetricValueToEbnf(metric.name)),
  ].filter(Boolean);

  return lines.join('\n');
}

function metricsToEbnf(metrics: Metric<MaybeMetricMeta>[]): string {
  const metricStrings = metrics.map(metricToEbnf);
  return metricStrings.filter(str => !!str).join('\n\n');
}

const formatter: MetricFormatter = {
  format: metricToEbnf,
  formatMultiple: metricsToEbnf,
};

export default formatter;
