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

export interface CasePeriod {
  readonly startDate: number;
  readonly endDate: number;
}

export interface CasePerson {
  readonly personalNumber: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: 'applicant' | 'coApplicant' | 'children' | 'unknown';
  hasSigned?: boolean;
}

export interface CasePersonRoleType {
  readonly client: 'applicant';
  readonly partner: 'coApplicant';
  readonly child: 'children';
}

export interface CaseItem {}
