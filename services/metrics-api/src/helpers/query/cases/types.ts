interface CaseItemStatus {
  readonly type: string;
}

export interface CaseItem {
  readonly status: CaseItemStatus;
}

export interface CasesQueryParams {
  key: string;
  value: string;
  index?: string;
}

export interface CasesQueryHandler {
  query(params: CasesQueryParams): Promise<CaseItem[]>;
}
