import type { VivaApplicationsStatusItem } from './vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from './vadaCompletions';
import type { VivaMyPagesCases, VivaMyPagesApplication } from './vivaMyPages';
import type { VivaWorkflow } from './vivaWorkflow';

export type VadaApplicationsStatusResponse = VivaApplicationsStatusItem[];

export interface VadaCompletionsResponse {
  readonly completions: VadaWorkflowCompletions;
}

export interface VadaLatestWorkflowResponse {
  readonly latestWorkflow: VivaWorkflow;
}

export interface VadaWorkflowsResponse {
  readonly workflows: VivaWorkflow[];
}

export interface VadaWorkflowResponse {
  readonly workflow: VivaWorkflow;
}

export interface VadaMyPagesReposnse {
  readonly cases: VivaMyPagesCases;
  readonly application: VivaMyPagesApplication;
}

export interface VadaSubmitApplicationResponse {
  readonly id: string;
  readonly status: string;
}

export interface VadaError {
  readonly status: string;
  readonly vadaResponse: {
    readonly error?: {
      readonly details?: {
        readonly errorCode?: string;
        readonly errorMessage?: string;
      };
    };
  };
}
