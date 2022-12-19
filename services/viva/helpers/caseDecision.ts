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

export default function decideNewCaseStatus(workflow: VivaWorkflow): string | undefined {
  const paymentList = makeArray(workflow.payments?.payment);
  const decisionList = getLatestDecision(workflow.decision);
  const decisionTypeCode = getDecisionTypeCode(decisionList);

  if (decisionTypeCode) {
    const hasPayment = paymentList.length > 0;
    return getCaseStatusType(decisionTypeCode, hasPayment);
  }

  if (isWorkflowLocked(workflow)) {
    return ACTIVE_PROCESSING;
  }

  return undefined;
}

export function calculateNewState(workflow: VivaWorkflow): string | undefined {
  if (isWorkflowLocked(workflow)) {
    return VIVA_APPLICATION_LOCKED;
  }

  return undefined;
}

function isWorkflowLocked(workflow: VivaWorkflow) {
  return !!workflow.application.islocked;
}

function getLatestDecision(
  decisionRoot: VivaWorkflowDecisionRoot | VivaWorkflowDecisionRoot[] | undefined
): VivaWorkflowDecision[] {
  if (Array.isArray(decisionRoot)) {
    const latest = decisionRoot.sort((a, b) => {
      return Number(new Date(b.createddatetime)) - Number(new Date(a.createddatetime));
    })[0];
    return makeArray(latest.decisions.decision);
  }

  return makeArray(decisionRoot?.decisions?.decision);
}

function getDecisionTypeCode(decisionList: VivaWorkflowDecision[]): number | undefined {
  if (decisionList.length === 0) {
    return undefined;
  }

  return decisionList.reduce((typeCode, decision) => typeCode | parseInt(decision.typecode, 10), 0);
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
