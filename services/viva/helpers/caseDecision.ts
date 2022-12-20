import {
  ACTIVE_PROCESSING,
  CLOSED_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
  VIVA_APPLICATION_LOCKED,
} from '../libs/constants';

import type {
  VivaWorkflow,
  VivaWorkflowDecisionRoot,
  VivaWorkflowDecision,
} from '../types/vivaWorkflow';

export function decideNewCaseStatus(workflow: VivaWorkflow): string | undefined {
  const latestDecision = getLatestDecision(workflow.decision);
  const decisionTypeCode = getDecisionTypeCode(latestDecision);

  if (decisionTypeCode) {
    const hasPayment = makeArray(workflow.payments?.payment).length > 0;
    return getCaseStatusType(decisionTypeCode, hasPayment);
  }

  return isWorkflowLocked(workflow) ? ACTIVE_PROCESSING : undefined;
}

export function desideNewState(workflow: VivaWorkflow): string | undefined {
  return isWorkflowLocked(workflow) ? VIVA_APPLICATION_LOCKED : undefined;
}

function isWorkflowLocked(workflow: VivaWorkflow): boolean {
  return !!workflow.application.islocked;
}

function getLatestDecision(
  decisionRoot: VivaWorkflowDecisionRoot | VivaWorkflowDecisionRoot[] | undefined
): VivaWorkflowDecision[] {
  if (Array.isArray(decisionRoot)) {
    const [latest] = decisionRoot.sort((a, b) => {
      return Number(new Date(b.createddatetime)) - Number(new Date(a.createddatetime));
    });
    return makeArray(latest.decisions.decision);
  }

  return makeArray(decisionRoot?.decisions?.decision);
}

function getDecisionTypeCode(decisions: VivaWorkflowDecision[]): number | undefined {
  if (decisions.length === 0) {
    return undefined;
  }
  return decisions.reduce((typeCode, decision) => typeCode | parseInt(decision.typecode, 10), 0);
}

function getCaseStatusType(decisionTypeCode: number, hasPayment: boolean): string {
  if (decisionTypeCode === 1 && hasPayment) {
    return CLOSED_APPROVED_VIVA;
  }

  if (decisionTypeCode === 2) {
    return CLOSED_REJECTED_VIVA;
  }

  if (decisionTypeCode === 3 && hasPayment) {
    return CLOSED_PARTIALLY_APPROVED_VIVA;
  }

  return ACTIVE_PROCESSING;
}

function makeArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (value === undefined) {
    return [];
  }

  return [value];
}
