import { caseQuaryHandler } from '../handlers/dynamoDb/caseQueryHandler';
import type { CaseQueryHandler, QueryParams, CaseItem } from './types';

export const caseQueries: CaseQueryHandler = {
  async query(params: QueryParams): Promise<CaseItem[]> {
    return caseQuaryHandler.query(params);
  },
};
