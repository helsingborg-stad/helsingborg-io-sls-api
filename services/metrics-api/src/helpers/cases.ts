import { cases } from './query';
import { getDatePattern } from './getDatePattern';
import type { QueryParams, CaseItem } from './query/cases/types';

async function get(): Promise<CaseItem[]> {
  const params: QueryParams = {
    key: 'GSI2PK',
    value: `CREATED#${getDatePattern('YYYYMMDD')}`,
    index: 'GSI2PK-SK-index',
  };

  return cases.query(params);
}

export default {
  get,
};
