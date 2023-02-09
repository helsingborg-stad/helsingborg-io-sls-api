export interface CaseKeys {
  PK: string;
  SK: string;
}

export interface SuccessEvent {
  keys: CaseKeys;
  pdfStorageBucketKey: string;
}
