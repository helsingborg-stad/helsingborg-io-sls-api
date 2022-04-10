export interface CaseUser {
  readonly personalNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly civilStatus: string;
  readonly mobilePhone: string;
  readonly email: string;
  readonly address: {
    readonly city: string;
    readonly street: string;
    readonly postalCode: string;
  };
  readonly uuid: string;
  readonly createdAt: number;
}

export interface CaseItem {
  id: string;
  PK: string;
  SK: string;
  state: string;
  expirationTime: number;
  createdAt: number;
  updatedAt: number | null;
  status: CaseStatus;
  forms?: {
    [key: string]: CaseForm;
  };
  provider: string;
  persons: CasePerson[];
  details: {
    workflowId: string | null;
    period: CasePeriod;
    readonly workflow?: unknown;
  };
  currentFormId: string;
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

export type CasePersonRole = 'applicant' | 'coApplicant' | 'children' | 'unknown';

export interface CasePerson {
  personalNumber: string;
  firstName: string;
  lastName: string;
  role: CasePersonRole;
  hasSigned?: boolean;
}

export interface CasePersonRoleType {
  readonly client: 'applicant';
  readonly partner: 'coApplicant';
  readonly child: 'children';
}

export interface CaseForm {
  answers: CaseFormAnswer[];
  encryption: CaseFormEncryption;
  currentPosition: {
    currentMainStep: number;
    currentMainStepIndex: number;
    index: number;
    level: number;
  };
}

export interface CaseFormAnswer {
  field: {
    id: string;
    tags: string[];
  };
  value: string;
}

export interface CaseFormEncryption {
  type: string;
  symmetricKeyName?: string;
  primes?: unknown;
  publicKeys?: {
    [personalNumber: number]: unknown | null;
  };
}
