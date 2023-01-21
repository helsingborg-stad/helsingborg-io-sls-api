import { cases } from './query';
import { getDatePattern } from './getDatePattern';
import { MetricsKey } from './metrics.constants';
import type { CasesQueryParams, CaseItem } from './query/cases/types';

export type StatusCollection = Record<MetricsKey, Record<string, number>>;

function casesReducer(
  accumulated: StatusCollection,
  { status: { type: statusType } }: CaseItem
): StatusCollection {
  const key = statusType.startsWith('closed:')
    ? MetricsKey.EKB_CASES_CLOSED_TOTAL
    : MetricsKey.EKB_CASES_OPEN_TOTAL;

  accumulated[key][statusType] = (accumulated[key][statusType] ?? 0) + 1;
  return accumulated;
}

export function createStatusCollection(cases: CaseItem[]): StatusCollection {
  const initial: StatusCollection = {
    [MetricsKey.EKB_CASES_OPEN_TOTAL]: {},
    [MetricsKey.EKB_CASES_CLOSED_TOTAL]: {},
  };
  return cases.reduce(casesReducer, initial);
}

function get(): Promise<CaseItem[]> {
  const params: CasesQueryParams = {
    key: 'GSI2PK',
    value: `CREATED#${getDatePattern('YYYYMM')}`,
    index: 'GSI2PK-index',
  };

  return cases.query(params);
}

export default {
  get,
};
