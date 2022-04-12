export enum EncryptionType {
  Decrypted = 'decrypted',
  PrivateAesKey = 'privateAesKey',
}

export interface Form {
  answers: Record<string, string> | unknown[];
  encryption: {
    type: EncryptionType;
  };
  currentPosition: {
    currentMainStepIndex: number;
    index: number;
    level: number;
    currentMainStep: number;
  };
}

export interface Details {
  workflowId: string;
}

export interface CaseItem {
  PK: string;
  SK: string;
  pdf: Buffer;
  currentFormId: string;
  details: Details;
  forms: Record<string, Form>;
}
