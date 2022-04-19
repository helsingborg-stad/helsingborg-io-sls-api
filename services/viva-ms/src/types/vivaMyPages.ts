export interface VivaMyPages {
  readonly case: VivaMyPagesPersonCase;
  readonly application: VivaMyPagesPersonApplication;
}

export interface VivaMyPagesPersonCase {
  readonly client: VivaClient;
  readonly officers: VivaOfficer | VivaOfficer[];
  readonly persons: VivaPerson | VivaPerson[] | null;
}

export interface VivaMyPagesPersonApplication {
  readonly workflowid?: string;
  readonly period: VivaMyPagesApplicationPeriod;
}

export interface VivaMyPagesApplicationPeriod {
  readonly start: string;
  readonly end: string;
}

export interface VivaClient {
  readonly pnumber: string;
  readonly fname: string;
  readonly lname: string;
  type: 'client';
}

export interface VivaPerson {
  readonly pnumber: string;
  readonly fname: string;
  readonly lname: string;
  readonly type: 'client' | 'partner' | 'child';
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

export interface VivaApplicationStatus {
  readonly code: number;
  readonly desciption: string;
}
