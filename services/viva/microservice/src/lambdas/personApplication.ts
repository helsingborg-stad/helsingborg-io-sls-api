import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { CaseUser } from '../types/caseItem';
import type { VivaMyPagesVivaCase, VivaMyPagesVivaApplication } from '../types/vivaMyPages';

export interface LambdaDetail {
  user: CaseUser;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface SuccessEvent {
  clientUser: CaseUser;
  myPages: VivaMyPagesVivaCase;
  application: VivaMyPagesVivaApplication;
}

export interface Dependencies {
  getMyPages: (personalNumber: string) => Promise<VivaMyPagesVivaCase>;
  getApplication: (personalNumber: string) => Promise<VivaMyPagesVivaApplication>;
  putSuccessEvent: (parameters: SuccessEvent) => Promise<void>;
}

export async function personApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const clientUser = input.detail.user;

  const myPages = await dependencies.getMyPages(clientUser.personalNumber);
  const application = await dependencies.getApplication(clientUser.personalNumber);

  await dependencies.putSuccessEvent({
    clientUser,
    myPages,
    application,
  });

  return true;
}

export const main = log.wrap(event => {
  return personApplication(event, {
    getMyPages: vivaAdapter.myPages.get,
    getApplication: vivaAdapter.applications.get,
    putSuccessEvent: putVivaMsEvent.personDetailSuccess,
  });
});
