import type { ValidTags } from '../helpers/caseTemplate/shared';

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

export interface RequestedCaseCompletions {
  readonly description: string;
  readonly received: boolean;
}

export interface CaseCompletions {
  readonly attachmentUploaded: string[];
  readonly description: string | null;
  readonly dueDate: number | null;
  readonly isAttachmentPending: boolean;
  readonly isCompleted: boolean;
  readonly isDueDateExpired: boolean;
  readonly isRandomCheck: boolean;
  readonly receivedDate: number | null;
  readonly requested: RequestedCaseCompletions[];
}

export interface CaseItem {
  readonly id: string;
  readonly PK: string;
  readonly SK: string;
  state: string;
  expirationTime: number;
  createdAt: number;
  updatedAt: number;
  status: CaseStatus;
  forms: Record<string, CaseForm>;
  GSI1?: string;
  provider: string;
  persons: CasePerson[];
  details: CaseDetails;
  currentFormId: string;
  pdf?: Buffer;
}

export interface CaseAdministrator {
  email: string;
  name: string;
  phone: string | null;
  title: string;
  type: string;
}

export interface CaseDetails {
  workflowId: string | null;
  period: CasePeriod;
  readonly workflow?: unknown;
  completions: CaseCompletions | null;
  administrators?: CaseAdministrator[];
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

export type PersonalNumber = string;

export interface CasePerson {
  personalNumber: PersonalNumber;
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
  numberOfMainSteps: number;
}

export type CaseFormAnswerValue = AnswerAttachment[] | string | boolean | number;

export interface CaseFormAnswer {
  readonly field: CaseFormAnswerField;
  readonly value: CaseFormAnswerValue;
}

export interface CaseFormAnswerAttachment {
  readonly field: CaseFormAnswerField;
  readonly value: AnswerAttachment[];
}

export interface AnswerAttachment {
  readonly externalDisplayName: string;
  readonly uploadedId: string;
  readonly deviceFileName: string;
  readonly mime: string;
  readonly id: string;
  readonly index: number;
  readonly questionId: string;
}

export interface CaseFormAnswerField {
  readonly id: string;
  readonly tags: ValidTags[] | string[];
}

export enum EncryptionType {
  Decrypted = 'decrypted',
}

export interface CaseFormEncryption {
  type: EncryptionType.Decrypted;
  encryptionKeyId?: string;
  symmetricKeyName?: string;
}
