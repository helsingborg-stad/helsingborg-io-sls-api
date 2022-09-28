import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

interface User {
  personalNumber: string;
}

export interface LambdaRequest {
  detail: User;
}

interface SuccessEvent {
  user: User;
  status: VivaApplicationsStatusItem[];
}

interface Dependencies {
  getStatus: (personalNumber: number) => Promise<VivaApplicationsStatusItem[]>;
  putSuccessEvent: (event: SuccessEvent) => Promise<void>;
}

export async function checkApplicationStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const user = input.detail;

  const status = await dependencies.getStatus(+user.personalNumber);

  await dependencies.putSuccessEvent({ user, status });

  return true;
}

export const main = log.wrap(event =>
  checkApplicationStatus(event, {
    getStatus: vivaAdapter.applications.status,
    putSuccessEvent: putVivaMsEvent.applicationStatusSuccess,
  })
);
