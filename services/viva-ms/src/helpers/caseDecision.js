import {
  ACTIVE_PROCESSING,
  CLOSED_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
} from '../libs/constants';

export default function decideNewCaseStatus(workflowAttributes) {
  const islocked = !!workflowAttributes.application?.islocked;
  const paymentList = makeArray(workflowAttributes.payments?.payment);
  const decisionList = getLatestDecision(workflowAttributes.decision);
  const decisionTypeCode = getDecisionTypeCode(decisionList);

  if (decisionTypeCode) {
    const hasPayment = paymentList.length > 0;
    return getCaseStatusType(decisionTypeCode, hasPayment);
  }

  if (islocked) {
    return ACTIVE_PROCESSING;
  }

  return undefined;
}

function getLatestDecision(decision) {
  if (Array.isArray(decision)) {
    const latest = decision.sort((a, b) => {
      return new Date(b.createddatetime) - new Date(a.createddatetime);
    })[0];
    return makeArray(latest?.decisions?.decision);
  }

  return makeArray(decision?.decisions?.decision);
}

function getDecisionTypeCode(decisionList) {
  if (decisionList.length === 0) {
    return undefined;
  }

  return decisionList.reduce((typeCode, decision) => typeCode | parseInt(decision.typecode, 10), 0);
}

function getCaseStatusType(decisionTypeCode, hasPayment) {
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

function makeArray(value) {
  let list = [];

  if (Array.isArray(value)) {
    list = [...value];
  }

  if (value != undefined) {
    list.push(value);
  }

  return list;
}
