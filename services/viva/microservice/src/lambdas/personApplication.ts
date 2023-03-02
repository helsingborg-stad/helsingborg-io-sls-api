import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { CaseUser } from '../types/caseItem';
import type { VivaMyPagesVivaCase, VivaMyPagesVivaApplication } from '../types/vivaMyPages';
import type { VivaApplicationsStatusItem } from 'types/vivaApplicationsStatus';

export interface SuccessEvent extends LambdaDetail {
  myPages: VivaMyPagesVivaCase;
  application: VivaMyPagesVivaApplication;
}

export interface LambdaDetail {
  user: CaseUser;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  getMyPages: (personalNumber: string) => Promise<VivaMyPagesVivaCase>;
  getApplication: (personalNumber: string) => Promise<VivaMyPagesVivaApplication>;
  triggerEvent: (params: SuccessEvent) => Promise<void>;
}

export async function personApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const {
    user: { personalNumber },
  } = input.detail;

  const myPages = await dependencies.getMyPages(personalNumber);
  const application = await dependencies.getApplication(personalNumber);

  await dependencies.triggerEvent({
    myPages,
    application,
    ...input.detail,
  });

  return true;
}

export const main = log.wrap(event => {
  return personApplication(event, {
    getMyPages: vivaAdapter.myPages.get,
    getApplication: vivaAdapter.applications.get,
    triggerEvent: putVivaMsEvent.personDetailSuccess,
  });
});
