interface CaseItemStatus {
  readonly type: string;
}

export interface CaseItem {
  readonly GSI2PK: string;
  readonly status: CaseItemStatus;
}

export interface QueryParams {
  key: string;
  value: string;
  index?: string;
}

export interface CaseQueryHandler {
  query(params: QueryParams): Promise<CaseItem[]>;
}
