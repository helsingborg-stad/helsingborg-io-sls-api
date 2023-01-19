import { cases } from './query';
import { getDatePattern } from './getDatePattern';
import type { QueryParams, CaseItem } from './query/cases/types';

async function get(): Promise<CaseItem[]> {
  const params: QueryParams = {
    key: 'GSI2PK',
    value: `CREATED#${getDatePattern('YYYYMM')}`,
    index: 'GSI2PK-index',
  };

  return cases.query(params);
}

export default {
  get,
};
