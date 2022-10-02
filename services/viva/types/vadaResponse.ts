import type { VivaApplicationsStatusItem } from './vivaApplicationsStatus';
import type { VivaWorkflow } from './VivaWorkflow';
import type { VadaWorkflowCompletions } from './vadaCompletions';
import type { VivaMyPagesCases, VivaMyPagesApplication } from './vivaMyPages';

export interface VadaApplicationsStatusResponse {
  readonly status: VivaApplicationsStatusItem[];
}

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
