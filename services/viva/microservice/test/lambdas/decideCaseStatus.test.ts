import { decideCaseStatus } from '../../src/lambdas/decideCaseStatus';
import type { LambdaRequest } from '../../src/lambdas/decideCaseStatus';
import type { CaseStatus } from '../../src/types/caseItem';
import type { VivaWorkflow, VivaWorkflowApplication } from '../../src/types/vivaWorkflow';

const caseKeys = {
  PK: 'USER#198602102389',
  SK: 'CASE#11111111-2222-3333-4444-555555555555',
};

function createLambdaInput(
  workflowParams: Partial<VivaWorkflow> = {},
  workflowApplicationParams: Partial<VivaWorkflowApplication> = {}
): LambdaRequest {
  return {
    detail: {
      caseKeys,
      workflow: {
        workflowid: 'XYZ123',
        application: {
          receiveddate: null,
          periodstartdate: null,
          periodenddate: null,
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
          ...workflowApplicationParams,
        },
        ...workflowParams,
      },
    },
  } as unknown as LambdaRequest;
}

it('successfully updates case with new status', async () => {
  const newSatatus: CaseStatus = {
    type: 'closed:approved:viva',
    name: 'Godkänd',
    description: 'Din ansökan är godkänd. Pengarna sätts in på ditt konto',
  };

  const updateCaseMock = jest.fn();
  const lambdaInput = createLambdaInput();

  const result = await decideCaseStatus(lambdaInput, {
    updateCase: updateCaseMock,
    putSuccessEvent: () => Promise.resolve(),
  });

  expect(result).toBe(true);
  expect(updateCaseMock).toHaveBeenCalledWith(caseKeys, newSatatus);
});
