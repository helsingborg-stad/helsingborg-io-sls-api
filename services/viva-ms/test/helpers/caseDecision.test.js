import decideNewCaseStatus from '../../helpers/caseDecision';

import {
  ACTIVE_PROCESSING,
  CLOSED_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
} from '../../../../libs/constants';

const workflow = {
  workflowid: 'EA2F293CA4763D1AC12587DD004F4ADE',
  application: {
    receiveddate: '2022-02-02T15:26:05+01:00',
    periodstartdate: '2022-01-01',
    periodenddate: '2022-01-31',
    otherperiod: null,
    requestingcompletion: null,
    completiondate: null,
    completionreceiveddate: null,
    completionsreceived: null,
    completionsuploaded: null,
    completions: null,
    completiondescription: null,
    completionduedate: null,
    islockedwithoutcompletionreceived: null,
    islocked: '2022-02-02T15:42:22+01:00',
  },
};

const workflowCalculation = {
  calculations: {
    calculation: {},
  },
};

const workflowDecisionApproved = {
  decision: {
    decisions: {
      decision: {
        typecode: '01',
      },
    },
  },
};

const workflowDecisionPartiallyApproved = {
  decision: {
    decisions: {
      decision: [
        {
          typecode: '03',
        },
        {
          typecode: '03',
        },
        {
          typecode: '01',
        },
        {
          typecode: '02',
        },
        {
          typecode: '01',
        },
      ],
    },
  },
};

const workflowDecisionRejected = {
  decision: {
    decisions: {
      decision: {
        typecode: '02',
      },
    },
  },
};

const workflowPayment = {
  payments: {
    payment: {},
  },
};

const workflowCalculationANDDecisionApproved = {
  ...workflow,
  ...workflowCalculation,
  ...workflowDecisionApproved,
};

const workflowCalculationANDPayment = {
  ...workflow,
  ...workflowCalculation,
  ...workflowPayment,
};

const workflowCalculationANDDecisionApprovedANDPayment = {
  ...workflow,
  ...workflowCalculation,
  ...workflowDecisionApproved,
  ...workflowPayment,
};

const workflowCalculationANDDecisionPartiallyApprovedANDPayment = {
  ...workflow,
  ...workflowCalculation,
  ...workflowDecisionPartiallyApproved,
  ...workflowPayment,
};

const workflowCalculationANDDecisionRejected = {
  ...workflow,
  ...workflowCalculation,
  ...workflowDecisionRejected,
};

it('Before the Viva administrator processes the application the case status must be unchanged', () => {
  const results = decideNewCaseStatus(workflow);
  expect(results).toBeUndefined();
});

it(`Calculation exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const results = decideNewCaseStatus(workflowCalculation);
  expect(results).toBe(ACTIVE_PROCESSING);
});

it('Payment exists in the Viva workflow collection, then the case status must be unchanged', () => {
  const results = decideNewCaseStatus(workflowPayment);
  expect(results).toBeUndefined();
});

it(`Decision(approved) exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const results = decideNewCaseStatus(workflowDecisionApproved);
  expect(results).toBe(ACTIVE_PROCESSING);
});

it(`Decision(partially approved) exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const results = decideNewCaseStatus(workflowDecisionPartiallyApproved);
  expect(results).toBe(ACTIVE_PROCESSING);
});

it(`Decision(rejected) exists in the Viva workflow collection, then status type must be ${CLOSED_REJECTED_VIVA}`, () => {
  const results = decideNewCaseStatus(workflowDecisionRejected);
  expect(results).toBe(CLOSED_REJECTED_VIVA);
});

it(`Calculation AND decision(approved) exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const results = decideNewCaseStatus(workflowCalculationANDDecisionApproved);
  expect(results).toBe(ACTIVE_PROCESSING);
});

it(`Calculation AND payment exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const results = decideNewCaseStatus(workflowCalculationANDPayment);
  expect(results).toBe(ACTIVE_PROCESSING);
});

it(`Calculation AND decision(approved) AND payment exists in the Viva workflow collection, then status type must be ${CLOSED_APPROVED_VIVA}`, () => {
  const results = decideNewCaseStatus(workflowCalculationANDDecisionApprovedANDPayment);
  expect(results).toBe(CLOSED_APPROVED_VIVA);
});

it(`Calculation AND decision(partially approved) AND payment exists in the Viva workflow collection, then status type must be ${CLOSED_PARTIALLY_APPROVED_VIVA}`, () => {
  const results = decideNewCaseStatus(workflowCalculationANDDecisionPartiallyApprovedANDPayment);
  expect(results).toBe(CLOSED_PARTIALLY_APPROVED_VIVA);
});

it(`Calculation AND decision(rejected) exists in the Viva workflow collection, then status type must be ${CLOSED_REJECTED_VIVA}`, () => {
  const results = decideNewCaseStatus(workflowCalculationANDDecisionRejected);
  expect(results).toBe(CLOSED_REJECTED_VIVA);
});
