import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import type { VivaApplicationStatus } from '../types/vivaMyPages';

interface User {
  personalNumber: string;
}

export interface LambdaRequest {
  detail: User;
}

interface SuccessEvent {
  user: User;
  status: VivaApplicationStatus[];
}

interface Dependencies {
  getStatus: (personalNumber: string) => Promise<VivaApplicationStatus[]>;
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
    getStatus: vivaAdapter.application.status,
    putSuccessEvent: putVivaMsEvent.applicationStatusSuccess,
  })
);
