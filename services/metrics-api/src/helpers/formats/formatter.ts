import { default as ebnf } from './ebnf';
import { InvalidArgumentError } from '../../libs/customErrors';
import type { MetricFormatter } from './formats.types';

export enum ValidFormat {
  EBNF = 'ebnf',
}

const formatters: Record<ValidFormat, MetricFormatter> = {
  ebnf,
};

export function getMetricFormatter(format: ValidFormat): MetricFormatter {
  const formatter = formatters[format];

  if (!formatter) {
    throw new InvalidArgumentError(`No valid metric formatter for format '${format}'`);
  }

  return formatter;
}
