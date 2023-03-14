import type { CaseItem } from '../../types/caseItem';

export interface ICaseFactory<TParams> {
  createCase(params: TParams): Promise<CaseItem>;
}
