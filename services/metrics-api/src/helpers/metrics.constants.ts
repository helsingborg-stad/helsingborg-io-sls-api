export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
  UNTYPED = 'untyped',
}

export const MetricsKey = {
  EKB_CASES_OPEN_TOTAL: 'ekb_cases_open_total',
  EKB_CASES_CLOSED_TOTAL: 'ekb_cases_closed_total',
} as const;

export const MetricsHelperText = {
  [MetricsKey.EKB_CASES_OPEN_TOTAL]: 'Total number of open cases',
  [MetricsKey.EKB_CASES_CLOSED_TOTAL]: 'Total number of closed cases',
} as const;

export type MetricsKey = typeof MetricsKey[keyof typeof MetricsKey];
export type MetricsHelperText = typeof MetricsHelperText[keyof typeof MetricsHelperText];
