export interface VivaWorkflow {
  readonly workflowid: string;
  readonly application: VivaWorkflowApplication;
}

export interface VivaWorkflowApplication {
  readonly receiveddate: Date | null;
  readonly periodstartdate: Date | null;
  readonly periodenddate: Date | null;
  readonly otherperiod: unknown | null;
  readonly requestingcompletion: string | null;
  readonly completiondate: Date | null;
  readonly completionreceiveddate: Date | null;
  readonly completionsreceived: VivaWorkflowCompletionsReceived | null;
  readonly completionsuploaded: VivaWorkflowCompletionsUploaded | null;
  readonly completions: VivaWorkflowCompletions | null;
  readonly completiondescription: string | null;
  readonly completionduedate: Date | null;
  readonly islockedwithoutcompletionreceived: Date | null;
  readonly islocked: Date | null;
  readonly decision?: VivaWorkflowDecisionRoot;
  readonly calculations?: unknown;
  readonly payments?: unknown;
  readonly journals?: unknown;
}

export interface VivaWorkflowCompletionsUploaded {
  readonly completionsuploaded: string[];
}

export interface VivaWorkflowCompletionsReceived {
  readonly completionreceived: string[];
}

export interface VivaWorkflowCompletions {
  readonly completion: string[];
}

export interface VivaWorkflowDecisionRoot {
  readonly ssi: VivaWorkflowDecisionSsi;
  readonly parentssi: string | null;
  readonly createdby: string | null;
  readonly createddatetime: Date | null;
  readonly subject: string | null;
  readonly periodstartdate: Date | null;
  readonly periodenddate: Date | null;
  readonly decisions: VivaWorkflowDecisions | VivaWorkflowDecisions[] | null;
}

export interface VivaWorkflowDecisionSsi {
  readonly server: string;
  readonly path: string;
  readonly id: string;
}

export interface VivaWorkflowDecisions {
  readonly decision: VivaWorkflowDecision | VivaWorkflowDecision[] | null;
}

export interface VivaWorkflowDecision {
  readonly id: string;
  readonly type: string;
  readonly typecode: string;
  readonly code: string;
  readonly codetext: string;
  readonly cause: string;
  readonly causetext: string;
  readonly causepartner: string | null;
  readonly causetextpartner: string | null;
  readonly purpose: string | null;
  readonly date: Date;
  readonly author: string;
  readonly amount: string;
  readonly explanation: string;
  readonly createdby: string;
  readonly createddatetime: Date;
}
