export interface VadaApplicationsStatus {
  readonly status: VivaApplicationsStatusItem[];
}

export interface VivaApplicationsStatusItem {
  readonly code: number;
  readonly description: string;
}
