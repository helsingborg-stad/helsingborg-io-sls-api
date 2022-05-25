import decideNewCaseStatus from '../../src/helpers/caseDecision';

import {
  ACTIVE_PROCESSING,
  CLOSED_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
} from '../../src/libs/constants';

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
    islocked: null,
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

const workflowDecisionList = {
  decision: [
    {
      decisions: {
        decision: {
          typecode: '02',
        },
      },
      createddatetime: '2022-02-17T08:34:02+01:00',
    },
    {
      decisions: {
        decision: [
          {
            typecode: '03',
          },
          {
            typecode: '01',
          },
        ],
      },
      createddatetime: '2022-02-18T10:13:04+01:00',
    },
  ],
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

const workflowDecisionWithListStructure = {
  ...workflow,
  ...workflowCalculation,
  ...workflowDecisionList,
  ...workflowPayment,
};

it('Before the Viva administrator processes the application the case status must be unchanged', () => {
  const results = decideNewCaseStatus(workflow);
  expect(results).toBeUndefined();
});

it(`Calculation exists in the Viva workflow collection, then status type must be ${ACTIVE_PROCESSING}`, () => {
  const workflowLockedWithCalculations = {
    ...workflow,
    application: {
      islocked: '123',
    },
    calculations: {
      calculation: {},
    },
  };
  const results = decideNewCaseStatus(workflowLockedWithCalculations);
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
  workflowCalculationANDPayment.application.islocked = '123';
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

it('Decision is an list of decisions, then handle the latest by date', () => {
  const results = decideNewCaseStatus(workflowDecisionWithListStructure);
  expect(results).toBe(CLOSED_PARTIALLY_APPROVED_VIVA);
});
