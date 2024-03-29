import log from '../libs/logs';
import {
  VIVA_STATUS_COMPLETION,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

type CompletionsRequiredEvent = LambdaDetail;
type SuccessEvent = LambdaDetail;

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  putCompletionsRequiredEvent: (params: CompletionsRequiredEvent) => Promise<void>;
  putSuccessEvent: (params: SuccessEvent) => Promise<void>;
}

export async function checkCompletionsStatus(input: LambdaRequest, dependencies: Dependencies) {
  const { vivaApplicantStatusCodeList } = input.detail;

  const requiredStatusCodeList = [
    VIVA_STATUS_COMPLETION,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (validateApplicationStatus(vivaApplicantStatusCodeList, requiredStatusCodeList)) {
    await dependencies.putCompletionsRequiredEvent(input.detail);
    return true;
  }

  await dependencies.putSuccessEvent(input.detail);

  return true;
}

export const main = log.wrap(event =>
  checkCompletionsStatus(event, {
    putCompletionsRequiredEvent: putVivaMsEvent.completions.required,
    putSuccessEvent: putVivaMsEvent.completions.success,
  })
);
