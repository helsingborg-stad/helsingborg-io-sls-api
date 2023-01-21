import { casesQuaryHandler } from '../handlers/dynamoDb/caseQueryHandler';
import type { CasesQueryHandler, CasesQueryParams, CaseItem } from './types';

export const caseQueries: CasesQueryHandler = {
  async query(params: CasesQueryParams): Promise<CaseItem[]> {
    return casesQuaryHandler.query(params);
  },
};
