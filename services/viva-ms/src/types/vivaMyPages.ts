export interface VivaMyPagesPersonCase {
  persons: {
    person: Record<string, unknown> | Record<string, unknown>[] | null;
  };
  client: VivaCaseClient;
}

export interface VivaCaseClient {
  type: string;
}

export interface VivaMyPagesPersonApplication {
  workflowid?: string;
  period: {
    start: string;
    end: string;
  };
}

export interface VivaMyPages {
  cases: VivaMyPagesPersonCase;
  application: VivaMyPagesPersonApplication;
}
