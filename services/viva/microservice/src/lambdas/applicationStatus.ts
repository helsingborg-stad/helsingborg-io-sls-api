import log from '../libs/logs';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { CaseUser } from '../types/caseItem';

export interface SuccessEvent {
  user: CaseUser;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaDetail {
  user: CaseUser;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  getStatus: (personalNumber: string) => Promise<VivaApplicationsStatusItem[]>;
  triggerEvent: (params: SuccessEvent) => Promise<void>;
}

export async function checkApplicationStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user } = input.detail;

  const status = await dependencies.getStatus(user.personalNumber);

  await dependencies.triggerEvent({ user, status });

  return true;
}

export const main = log.wrap(event =>
  checkApplicationStatus(event, {
    getStatus: vivaAdapter.applications.status,
    triggerEvent: putVivaMsEvent.applicationStatusSuccess,
  })
);
