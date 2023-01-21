import { cases } from './query';
import { getDatePattern } from './getDatePattern';
import type { CasesQueryParams, CaseItem } from './query/cases/types';

async function get(): Promise<CaseItem[]> {
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
