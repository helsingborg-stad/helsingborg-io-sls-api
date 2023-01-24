import { cases } from './query';
import { getDatePattern } from './getDatePattern';
import { MetricsKey } from './metrics.constants';
import type { CasesQueryParams, CaseItem } from './query/cases/types';
import {
  NEW_APPLICATION,
  NOT_STARTED,
  ACTIVE_ONGOING,
  ACTIVE_ONGOING_NEW_APPLICATION,
  ACTIVE_SIGNATURE_COMPLETED,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SUBMITTED,
  ACTIVE_PROCESSING,
  NEW_APPLICATION_VIVA,
  NOT_STARTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_COMPLETION_SUBMITTED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA,
  ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
  CLOSED_APPROVED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_COMPLETION_REJECTED_VIVA,
  CLOSED_RANDOM_CHECK_REJECTED_VIVA,
} from '../../../../libs/constants';

export type StatusCollection = Record<MetricsKey, Record<string, number>>;

function casesToStatusCollectionReducer(
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
    [MetricsKey.EKB_CASES_OPEN_TOTAL]: {
      [NEW_APPLICATION]: 0,
      [NOT_STARTED]: 0,
      [ACTIVE_ONGOING]: 0,
      [ACTIVE_ONGOING_NEW_APPLICATION]: 0,
      [ACTIVE_SIGNATURE_COMPLETED]: 0,
      [ACTIVE_SIGNATURE_PENDING]: 0,
      [ACTIVE_SUBMITTED]: 0,
      [ACTIVE_PROCESSING]: 0,
      [NEW_APPLICATION_VIVA]: 0,
      [NOT_STARTED_VIVA]: 0,
      [ACTIVE_COMPLETION_REQUIRED_VIVA]: 0,
      [ACTIVE_COMPLETION_SUBMITTED_VIVA]: 0,
      [ACTIVE_RANDOM_CHECK_REQUIRED_VIVA]: 0,
      [ACTIVE_RANDOM_CHECK_SUBMITTED_VIVA]: 0,
      [ACTIVE_NEW_APPLICATION_RANDOM_CHECK_VIVA]: 0,
      [ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA]: 0,
    },
    [MetricsKey.EKB_CASES_CLOSED_TOTAL]: {
      [CLOSED_APPROVED_VIVA]: 0,
      [CLOSED_PARTIALLY_APPROVED_VIVA]: 0,
      [CLOSED_REJECTED_VIVA]: 0,
      [CLOSED_COMPLETION_REJECTED_VIVA]: 0,
      [CLOSED_RANDOM_CHECK_REJECTED_VIVA]: 0,
    },
  };
  return cases.reduce(casesToStatusCollectionReducer, initial);
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
