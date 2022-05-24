import { CaseItem } from '../../../types/caseItem';

export interface CaseQueryHandler {
  get(keys: { PK: string; SK?: string }): Promise<CaseItem>;
}
