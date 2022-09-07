import log from '../libs/logs';

import {
  VIVA_STATUS_COMPLETION,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import type { VivaApplicationStatus } from '../types/vivaMyPages';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  vivaApplicantStatusCodeList: VivaApplicationStatus[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  putCompletionsRequiredEvent: (params: LambdaDetails) => Promise<void>;
  putSuccessEvent: (params: LambdaDetails) => Promise<void>;
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

export const main = log.wrap(async event => {
  return checkCompletionsStatus(event, {
    putCompletionsRequiredEvent: putVivaMsEvent.completions.required,
    putSuccessEvent: putVivaMsEvent.completions.success,
  });
});
