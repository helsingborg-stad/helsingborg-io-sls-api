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
