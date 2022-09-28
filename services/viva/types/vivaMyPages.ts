export enum VivaOfficerType {
  Officer = 'officer',
  Assistant = 'assistant',
}

export enum VivaAttachmentCategory {
  Expenses = 'expenses',
  Incomes = 'incomes',
  Completion = 'completion',
  Unknown = '',
}

export enum VivaPersonType {
  Client = 'client',
  Partner = 'partner',
  Child = 'child',
}

export enum VivaApplicationType {
  New = 'new',
  Recurring = 'recurring',
}

export interface VivaMyPages {
  readonly cases: VivaMyPagesCases;
  readonly application: VivaMyPagesApplication;
}

export interface VivaMyPagesApplication {
  readonly status: string;
  readonly vivaapplication: VivaMyPagesVivaApplication;
}

export interface VivaMyPagesCases {
  readonly status: string;
  readonly vivacases: VivaMyPagesVivaCases;
}

export interface VivaMyPagesVivaCases {
  readonly vivacase: VivaMyPagesVivaCase;
}

export interface VivaMyPagesVivaCase {
  readonly client: VivaClient;
  readonly officers?: VivaOfficersOfficer;
  readonly persons: VivaPersonsPerson | null;
}

export interface VivaOfficersOfficer {
  readonly officer: VivaOfficer[] | VivaOfficer;
}

export interface VivaPersonsPerson {
  readonly person: VivaPerson[] | VivaPerson;
}

export interface VivaMyPagesVivaApplication {
  readonly workflowid?: string;
  readonly period: VivaMyPagesApplicationPeriod;
}

/**
 * Expected string format: 'YYYY-MM-DD'
 */
export interface VivaMyPagesApplicationPeriod {
  readonly start: string;
  readonly end: string;
}

export interface VivaClient {
  readonly pnumber: string;
  readonly fname: string;
  readonly lname: string;
  readonly type?: VivaPersonType.Client;
}

export interface VivaPerson {
  readonly pnumber: string;
  readonly fname: string;
  readonly lname: string;
  readonly type: VivaPersonType;
  readonly startdate?: string | null;
  readonly startend?: string | null;
  readonly days?: string | null;
}

export interface VivaOfficer {
  readonly name: string;
  readonly type: string;
  readonly typeenclair: string;
  readonly phone: string | null;
  readonly mail: string;
  readonly title: string;
}
