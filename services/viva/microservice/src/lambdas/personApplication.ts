import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { VivaMyPagesVivaCase } from '../types/vivaMyPages';

interface User {
  personalNumber: string;
}

export interface LambdaDetail {
  user: User;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface SuccessEvent {
  clientUser: User;
  vivaPersonDetail: VivaMyPagesVivaCase;
}

export interface Dependencies {
  getMyPages: (personalNumber: string) => Promise<VivaMyPagesVivaCase>;
  putSuccessEvent: (parameters: SuccessEvent) => Promise<void>;
}

export async function personApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const clientUser = input.detail.user;

  const vivaPersonDetail = await dependencies.getMyPages(clientUser.personalNumber);

  await dependencies.putSuccessEvent({
    clientUser,
    vivaPersonDetail,
  });

  return true;
}

export const main = log.wrap(event => {
  return personApplication(event, {
    getMyPages: vivaAdapter.myPages.get,
    putSuccessEvent: putVivaMsEvent.personDetailSuccess,
  });
});
