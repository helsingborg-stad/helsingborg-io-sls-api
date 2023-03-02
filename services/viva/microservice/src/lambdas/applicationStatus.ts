import log from '../libs/logs';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { CaseUser } from 'types/caseItem';

interface SuccessEvent {
  user: CaseUser;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: CaseUser;
}

interface Dependencies {
  getStatus: (personalNumber: string) => Promise<VivaApplicationsStatusItem[]>;
  putSuccessEvent: (event: SuccessEvent) => Promise<void>;
}

export async function checkApplicationStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const user = input.detail;

  const status = await dependencies.getStatus(user.personalNumber);

  await dependencies.putSuccessEvent({ user, status });

  return true;
}

export const main = log.wrap(event =>
  checkApplicationStatus(event, {
    getStatus: vivaAdapter.applications.status,
    putSuccessEvent: putVivaMsEvent.applicationStatusSuccess,
  })
);
