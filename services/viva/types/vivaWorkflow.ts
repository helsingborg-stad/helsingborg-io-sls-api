export interface VivaWorkflowPayment {
  readonly amount: string;
  readonly canceled: boolean | null;
  readonly createdBy: string;
  readonly createdTime: string;
  readonly giveDate: string;
  readonly method: string;
  readonly msg1: string | null;
  readonly msg2: string | null;
  readonly paymentid: string;
  readonly periodenddate: string;
  readonly periodstartdate: string;
  readonly purpose: string | null;
  readonly receivername: string;
  readonly status: string;
  readonly subject: string;
  readonly type: string;
}

export interface VivaWorkflowPaymentsRoot {
  payment: VivaWorkflowPayment | VivaWorkflowPayment[];
}

export interface VivaWorkflow {
  readonly workflowid: string;
  readonly application: VivaWorkflowApplication;
  readonly decision?: VivaWorkflowDecisionRoot | VivaWorkflowDecisionRoot[];
  readonly calculations?: VivaWorkflowCalculationsRoot;
  readonly payments?: VivaWorkflowPaymentsRoot;
  readonly journals?: VivaWorkflowJournalsRoot;
  readonly notes?: unknown;
}

export interface VivaWorkflowApplication {
  readonly receiveddate: string | null;
  readonly periodstartdate: string | null;
  readonly periodenddate: string | null;
  readonly otherperiod: unknown | null;
  readonly requestingcompletion: string | null;
  readonly completiondate: string | null;
  readonly completionreceiveddate: string | null;
  readonly completionsreceived: VivaWorkflowCompletionsReceived | null;
  readonly completionsuploaded: VivaWorkflowCompletionsUploaded | null;
  readonly completions: VivaWorkflowCompletions | null;
  readonly completiondescription: string | null;
  readonly completionduedate: string | null;
  readonly islockedwithoutcompletionreceived: string | null;
  readonly islocked: string | null;
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
  readonly ssi: VivaWorkflowSsi;
  readonly parentssi: string | null;
  readonly createdby: string | null;
  readonly createddatetime: string | null;
  readonly subject: string | null;
  readonly periodstartdate: string | null;
  readonly periodenddate: string | null;
  readonly decisions: VivaWorkflowDecisions | VivaWorkflowDecisions[] | null;
}

export interface VivaWorkflowSsi {
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
  readonly date: string;
  readonly author: string;
  readonly amount: string;
  readonly explanation: string;
  readonly createdby: string;
  readonly createddatetime: string;
}

export interface VivaWorkflowCalculationsRoot {
  readonly calculation: VivaWorkflowCalculation;
}

export interface VivaWorkflowCalculation {
  readonly ssi: VivaWorkflowSsi;
  readonly parentssi: string | null;
  readonly createdby: string | null;
  readonly createddatetime: string | null;
  readonly subject: string | null;
  readonly periodstartdate: string | null;
  readonly periodenddate: string | null;
  readonly calculationtype: string | null;
  readonly calculationpersons: VivaWorkflowCalculationPersonsRoot | null;
}

export interface VivaWorkflowCalculationPersonsRoot {
  readonly calculationperson: VivaWorkflowCalculationPerson[] | VivaWorkflowCalculationPerson;
}

export interface VivaWorkflowCalculationPerson {
  readonly name: string | null;
  readonly pnumber: string | null;
  readonly norm: string | null;
  readonly days: string | null;
  readonly home: string | null;
  readonly daycare: string | null;
}

export interface VivaWorkflowCalculationCostsRoot {
  readonly costs: VivaWorkflowCalculationCost[] | VivaWorkflowCalculationCost;
}

export interface VivaWorkflowCalculationCost {
  type: string | null;
  actual: string | null;
  approved: string | null;
  note: string | null;
}

export interface VivaWorkflowCalculationNorm {
  normpart: VivaWorkflowCalculationNormPart[] | VivaWorkflowCalculationNormPart | null;
  normsum: string | null;
  normgemsum: string | null;
  normsubtotal: string | null;
  costsum: string | null;
  incomesum: string | null;
  reductionsum: string | null;
  calculationsum: string | null;
  note: string | null;
}

export interface VivaWorkflowCalculationNormPart {
  type: string | null;
  amount: string | null;
  note: string | null;
}

export interface VivaWorkflowJournalsRoot {
  journal: VivaWorkflowJournal[] | VivaWorkflowJournal | null;
}

export interface VivaWorkflowJournal {
  ssi: VivaWorkflowSsi;
  createdby: string | null;
  createddatetime: string | null;
  responsible: string | null;
  eventdate: string | null;
  subject: string | null;
  periodstartdate: string | null;
  periodenddate: string | null;
  notes: VivaWorkflowJournalsNotesRoot;
}

export interface VivaWorkflowJournalsNotesRoot {
  note: VivaWorkflowJournalsNote[] | VivaWorkflowJournalsNote | null;
}

export interface VivaWorkflowJournalsNote {
  label: string | null;
  text: string | null;
}
