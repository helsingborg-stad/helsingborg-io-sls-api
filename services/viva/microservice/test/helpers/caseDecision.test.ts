import { decideNewCaseStatus, desideNewState } from '../../src/helpers/caseDecision';
import {
  ACTIVE_PROCESSING,
  CLOSED_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
  VIVA_APPLICATION_LOCKED,
} from '../../src/libs/constants';

import type { VivaWorkflow } from '../../src/types/vivaWorkflow';

function createWorkflow(workflowParams: Partial<VivaWorkflow> = {}): VivaWorkflow {
  const workflow: VivaWorkflow = {
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

  return {
    ...workflow,
    ...workflowParams,
  };
}

describe('Decide new case status', () => {
  it('returns undefined if application is not locked, no decision, no payments or no calculations exists', () => {
    const results = decideNewCaseStatus(createWorkflow());
    expect(results).toBeUndefined();
  });

  it('returns undefined if includes only payments', () => {
    const workflowMock = {
      payments: {},
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBeUndefined();
  });

  it(`returns [${ACTIVE_PROCESSING}] if workflow is locked`, () => {
    const workflowMock = {
      application: {
        islocked: '2022-01-01T00:00:00+01:00',
      },
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(ACTIVE_PROCESSING);
  });

  it(`returns [${ACTIVE_PROCESSING}] if only dicision is approved`, () => {
    const workflowMock = {
      decision: {
        decisions: {
          decision: {
            typecode: '01',
          },
        },
      },
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(ACTIVE_PROCESSING);
  });

  it(`returns [${ACTIVE_PROCESSING}] if dicision is partially approved`, () => {
    const workflowMock = {
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
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(ACTIVE_PROCESSING);
  });

  it(`returns [${CLOSED_REJECTED_VIVA}] if decision is rejected`, () => {
    const workflowMock = {
      decision: {
        decisions: {
          decision: {
            typecode: '02',
          },
        },
      },
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(CLOSED_REJECTED_VIVA);
  });

  it(`returns [${CLOSED_APPROVED_VIVA}] if decision is approved, calculations and payment exists`, () => {
    const workflowMock = {
      decision: {
        decisions: {
          decision: {
            typecode: '01',
          },
        },
      },
      payments: {
        payment: {},
      },
      calculations: {},
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(CLOSED_APPROVED_VIVA);
  });

  it(`returns [${CLOSED_PARTIALLY_APPROVED_VIVA}] if latest decision is partially approved`, () => {
    const workflowMock = {
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
                typecode: '02',
              },
              {
                typecode: '01',
              },
            ],
          },
          createddatetime: '2022-02-18T10:13:04+01:00',
        },
      ],
      payments: {
        payment: {},
      },
      calculations: {},
    } as VivaWorkflow;

    const results = decideNewCaseStatus(createWorkflow(workflowMock));
    expect(results).toBe(CLOSED_PARTIALLY_APPROVED_VIVA);
  });
});

describe('Decide new state', () => {
  it('returns undefined if application islocked set to null', () => {
    const results = desideNewState(createWorkflow());
    expect(results).toBeUndefined();
  });

  it(`returns [${VIVA_APPLICATION_LOCKED}] if application islocked is set`, () => {
    const workflowMock = {
      application: {
        islocked: '2022-01-01T00:00:00+01:00',
      },
    } as VivaWorkflow;

    const results = desideNewState(createWorkflow(workflowMock));
    expect(results).toBe(VIVA_APPLICATION_LOCKED);
  });
});
