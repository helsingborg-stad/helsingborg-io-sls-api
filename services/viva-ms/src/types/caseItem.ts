export interface CaseUser {
  readonly personalNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly civilStatus?: string;
  readonly mobilePhone?: string;
  readonly email?: string;
  readonly address?: CaseUserAddress;
  readonly uuid?: string;
  readonly createdAt?: number;
}

export interface CaseUserAddress {
  readonly city?: string;
  readonly street?: string;
  readonly postalCode?: string;
}

interface RequestedCaseCompletions {
  description: string;
  received: boolean;
}

export interface CaseCompletions {
  requested?: RequestedCaseCompletions[];
  attachmentUploaded?: string[];
  completed?: boolean;
  dueDate?: number;
  isCompleted?: boolean;
  isAttachmentPending?: boolean;
  isRandomCheck?: boolean;
}

export interface CaseItem {
  id: string;
  PK: string;
  SK: string;
  state: string;
  expirationTime: number;
  createdAt: number;
  updatedAt: number;
  status: CaseStatus;
  forms: Record<string, CaseForm> | null;
  GSI1?: string;
  provider: string;
  persons: CasePerson[];
  details: CaseDetails | null;
  currentFormId: string;
  pdf?: Buffer;
}

export interface CaseDetails {
  workflowId: string | null;
  period: CasePeriod;
  readonly workflow?: unknown;
  completions?: CaseCompletions;
}

export interface CaseStatus {
  type: string;
  name: string;
  description: string;
}

export interface CasePeriod {
  startDate: number;
  endDate: number;
}

export enum CasePersonRole {
  Applicant = 'applicant',
  CoApplicant = 'coApplicant',
  Children = 'children',
  Unknown = 'unknown',
}

export interface CasePerson {
  personalNumber: string;
  firstName: string;
  lastName: string;
  role: CasePersonRole;
  hasSigned?: boolean;
}

export interface CaseForm {
  answers: CaseFormAnswer[];
  encryption: CaseFormEncryption;
  currentPosition: CaseFormCurrentPosition;
}

export interface CaseFormCurrentPosition {
  currentMainStep: number;
  currentMainStepIndex: number;
  index: number;
  level: number;
}

export interface CaseFormAnswer {
  field: CaseFormAnswerField;
  value: string;
}

export interface CaseFormAnswerField {
  id: string;
  tags: string[];
}

export enum EncryptionType {
  Decrypted = 'decrypted',
}

export interface CaseFormEncryption {
  type: EncryptionType.Decrypted;
  symmetricKeyName?: string;
}
